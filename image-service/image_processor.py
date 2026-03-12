import daft
import base64
from pathlib import Path
from typing import Optional
from openai import OpenAI
from config import get_settings
import numpy as np
from numpy.typing import NDArray

_ray_initialized = False

def _ensure_ray_initialized():
    global _ray_initialized
    if not _ray_initialized:
        daft.set_runner_ray()
        _ray_initialized = True

settings = get_settings()
client = OpenAI(api_key=settings.openai_api_key)


@daft.udf(return_dtype=daft.DataType.python())
def analyze_image_udf(image_bytes: bytes) -> dict:
    base64_image = base64.b64encode(image_bytes).decode("utf-8")
    response = client.chat.completions.create(
        model=settings.openai_vision_model,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": "请详细描述这张图片的内容，包括：主体对象、场景、色彩、风格、情感氛围等。用中文回答，简洁明了。",
                    },
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"},
                    },
                ],
            }
        ],
        max_tokens=500,
    )
    return {
        "description": response.choices[0].message.content,
        "model": settings.openai_vision_model,
    }


@daft.udf(return_dtype=daft.DataType.python())
def generate_embedding_udf(text: str) -> list:
    response = client.embeddings.create(model=settings.openai_embedding_model, input=text)
    return response.data[0].embedding


class ImageProcessor:
    def __init__(self):
        self.vision_model = settings.openai_vision_model
        self.embedding_model = settings.openai_embedding_model

    def encode_image_to_base64(self, image_path: str) -> str:
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode("utf-8")

    def analyze_image(self, image_path: str) -> dict:
        base64_image = self.encode_image_to_base64(image_path)
        response = client.chat.completions.create(
            model=self.vision_model,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "请详细描述这张图片的内容，包括：主体对象、场景、色彩、风格、情感氛围等。用中文回答，简洁明了。",
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"},
                        },
                    ],
                }
            ],
            max_tokens=500,
        )
        description = response.choices[0].message.content
        return {
            "description": description,
            "model": self.vision_model,
        }

    def generate_embedding(self, text: str) -> list[float]:
        response = client.embeddings.create(model=self.embedding_model, input=text)
        return response.data[0].embedding

    def generate_embeddings_batch(self, texts: list[str]) -> list[list[float]]:
        response = client.embeddings.create(model=self.embedding_model, input=texts)
        return [item.embedding for item in response.data]

    def process_single_image(self, image_path: str) -> dict:
        analysis = self.analyze_image(image_path)
        embedding = self.generate_embedding(analysis["description"])
        return {
            "description": analysis["description"],
            "embedding": embedding,
            "model": analysis["model"],
        }


class BatchImageProcessor:
    def __init__(self, max_workers: int = 4):
        self.image_processor = ImageProcessor()
        self.max_workers = max_workers

    def process_directory_daft(
        self, directory_path: str, extensions: Optional[list[str]] = None
    ) -> list[dict]:
        _ensure_ray_initialized()

        if extensions is None:
            extensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"]

        directory = Path(directory_path)
        glob_patterns = []
        for ext in extensions:
            glob_patterns.append(f"{directory}/*{ext}")
            glob_patterns.append(f"{directory}/*{ext.upper()}")

        df = daft.from_glob_path(glob_patterns)

        df = df.with_column("image", df["path"].url.download())
        df = df.with_column("analysis", analyze_image_udf(df["image"]))
        df = df.with_column("description", df["analysis"].apply(lambda x: x["description"], return_dtype=str))
        df = df.with_column("embedding", generate_embedding_udf(df["description"]))
        df = df.with_column("model", df["analysis"].apply(lambda x: x["model"], return_dtype=str))

        df = df.select("path", "description", "embedding", "model")

        results = []
        for row in df.to_pydict().rows():
            results.append({
                "image_path": row["path"],
                "description": row["description"],
                "embedding": row["embedding"],
                "model": row["model"],
                "status": "success",
            })
        return results

    def process_single_with_path(self, image_path: str) -> dict:
        try:
            result = self.image_processor.process_single_image(image_path)
            result["image_path"] = image_path
            result["status"] = "success"
        except Exception as e:
            result = {
                "image_path": image_path,
                "status": "error",
                "error": str(e),
                "description": None,
                "embedding": None,
            }
        return result

    def process_batch_parallel(self, image_paths: list[str]) -> list[dict]:
        import concurrent.futures

        results = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            future_to_path = {
                executor.submit(self.process_single_with_path, path): path
                for path in image_paths
            }
            for future in concurrent.futures.as_completed(future_to_path):
                try:
                    result = future.result()
                    results.append(result)
                except Exception as e:
                    path = future_to_path[future]
                    results.append({
                        "image_path": path,
                        "status": "error",
                        "error": str(e),
                        "description": None,
                        "embedding": None,
                    })
        return results

    def process_directory(
        self, directory_path: str, extensions: Optional[list[str]] = None, use_daft: bool = True
    ) -> list[dict]:
        if use_daft:
            return self.process_directory_daft(directory_path, extensions)

        if extensions is None:
            extensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"]

        directory = Path(directory_path)
        image_paths = []
        for ext in extensions:
            image_paths.extend(directory.glob(f"*{ext}"))
            image_paths.extend(directory.glob(f"*{ext.upper()}"))

        image_paths = [str(p) for p in image_paths]
        return self.process_batch_parallel(image_paths)

    def process_paths(self, image_paths: list[str]) -> list[dict]:
        valid_paths = [p for p in image_paths if Path(p).exists()]
        return self.process_batch_parallel(valid_paths)


class SemanticSearch:
    def __init__(self):
        self.embedding_model = settings.openai_embedding_model

    def text_to_embedding(self, query: str) -> list[float]:
        response = client.embeddings.create(model=self.embedding_model, input=query)
        return response.data[0].embedding

    def cosine_similarity(self, vec1: list[float], vec2: list[float]) -> float:
        arr1: NDArray = np.array(vec1)
        arr2: NDArray = np.array(vec2)
        return float(np.dot(arr1, arr2) / (np.linalg.norm(arr1) * np.linalg.norm(arr2)))

    def cosine_similarity_batch(
        self, query_vec: list[float], embeddings: list[list[float]]
    ) -> list[float]:
        query: NDArray = np.array(query_vec)
        emb_matrix: NDArray = np.array(embeddings)
        norms = np.linalg.norm(emb_matrix, axis=1)
        similarities = np.dot(emb_matrix, query) / (norms * np.linalg.norm(query))
        return similarities.tolist()

    def search_by_text(
        self, query: str, images_with_embeddings: list[dict], top_k: int = 10
    ) -> list[dict]:
        query_embedding = self.text_to_embedding(query)

        valid_images = [img for img in images_with_embeddings if img.get("embedding")]
        if not valid_images:
            return []

        embeddings = [img["embedding"] for img in valid_images]
        similarities = self.cosine_similarity_batch(query_embedding, embeddings)

        results = []
        for img, sim in zip(valid_images, similarities):
            results.append({**img, "similarity": sim})

        results.sort(key=lambda x: x["similarity"], reverse=True)
        return results[:top_k]

    def search_by_image(
        self, image_path: str, images_with_embeddings: list[dict], top_k: int = 10
    ) -> list[dict]:
        processor = ImageProcessor()
        analysis = processor.analyze_image(image_path)
        query_embedding = processor.generate_embedding(analysis["description"])

        valid_images = [
            img
            for img in images_with_embeddings
            if img.get("embedding") and img.get("image_path") != image_path
        ]
        if not valid_images:
            return []

        embeddings = [img["embedding"] for img in valid_images]
        similarities = self.cosine_similarity_batch(query_embedding, embeddings)

        results = []
        for img, sim in zip(valid_images, similarities):
            results.append({**img, "similarity": sim})

        results.sort(key=lambda x: x["similarity"], reverse=True)
        return results[:top_k]

    def create_search_index_daft(self, images_with_embeddings: list[dict]) -> daft.DataFrame:
        data = {
            "id": [],
            "image_path": [],
            "description": [],
            "embedding": [],
        }
        for img in images_with_embeddings:
            if img.get("embedding"):
                data["id"].append(img.get("id"))
                data["image_path"].append(img.get("image_path"))
                data["description"].append(img.get("description"))
                data["embedding"].append(img.get("embedding"))

        return daft.from_pydict(data)

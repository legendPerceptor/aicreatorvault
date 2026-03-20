#!/usr/bin/env python3
"""
将现有图片 embedding 迁移到 Qdrant

使用方法：
    python scripts/migrate_to_qdrant.py

环境变量：
    DATABASE_URL: PostgreSQL 连接字符串
    QDRANT_HOST: Qdrant 服务器地址（默认 localhost）
    QDRANT_PORT: Qdrant 端口（默认 6333）
"""

import os
import sys
import json
import asyncio
from pathlib import Path

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root / "image-service"))

import psycopg2
from psycopg2.extras import RealDictCursor
from qdrant_client import get_qdrant_manager


def get_database_connection():
    """获取数据库连接"""
    database_url = os.environ.get("DATABASE_URL")
    
    if not database_url:
        # 从环境变量构建连接字符串
        db_host = os.environ.get("DB_HOST", "localhost")
        db_port = os.environ.get("DB_PORT", "5432")
        db_name = os.environ.get("DB_NAME", "aicreatorvault")
        db_user = os.environ.get("DB_USER", "aicreator")
        db_password = os.environ.get("DB_PASSWORD")
        
        if not db_password:
            raise ValueError("DB_PASSWORD 环境变量未设置")
        
        database_url = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
    
    return psycopg2.connect(database_url)


def fetch_images_with_embeddings(conn):
    """从数据库获取所有带 embedding 的图片"""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT 
                i.id,
                i.filename,
                i.description,
                i.embedding,
                i.score,
                i."createdAt",
                p.content as prompt_content
            FROM "Images" i
            LEFT JOIN "Prompts" p ON i."promptId" = p.id
            WHERE i.embedding IS NOT NULL
            ORDER BY i.id
        """)
        
        return cur.fetchall()


def prepare_point(image):
    """准备 Qdrant 点数据"""
    # 解析 embedding（如果是字符串则解析 JSON）
    embedding = image["embedding"]
    if isinstance(embedding, str):
        embedding = json.loads(embedding)
    
    # 准备元数据
    metadata = {
        "filename": image["filename"],
        "description": image["description"] or "",
        "score": float(image["score"]) if image["score"] else 0.0,
        "created_at": image["createdAt"].isoformat() if image["createdAt"] else None,
        "prompt_content": image["prompt_content"] or ""
    }
    
    return {
        "id": image["id"],
        "embedding": embedding,
        "metadata": metadata
    }


def migrate_to_qdrant(batch_size=100):
    """执行迁移"""
    print("=" * 60)
    print("开始迁移图片 embedding 到 Qdrant")
    print("=" * 60)
    
    # 初始化 Qdrant
    print("\n[1/3] 初始化 Qdrant 连接...")
    qdrant = get_qdrant_manager()
    
    if not qdrant.health_check():
        print("❌ 无法连接到 Qdrant")
        return False
    
    # 初始化集合
    qdrant.init_collection()
    print("✓ Qdrant 连接成功")
    
    # 连接数据库
    print("\n[2/3] 连接数据库...")
    conn = get_database_connection()
    print("✓ 数据库连接成功")
    
    # 获取图片数据
    print("\n[3/3] 获取图片数据...")
    images = fetch_images_with_embeddings(conn)
    total = len(images)
    
    if total == 0:
        print("⚠️  数据库中没有带 embedding 的图片")
        conn.close()
        return True
    
    print(f"✓ 找到 {total} 张带 embedding 的图片")
    
    # 批量迁移
    print(f"\n开始迁移（批次大小: {batch_size}）...")
    points = []
    
    for i, image in enumerate(images, 1):
        try:
            point = prepare_point(image)
            points.append(point)
            
            # 批量插入
            if len(points) >= batch_size or i == total:
                success = qdrant.batch_upsert(points)
                
                if success:
                    print(f"  ✓ 已迁移: {len(points)} 张图片 (总计: {i}/{total})")
                else:
                    print(f"  ❌ 批次迁移失败 (图片 ID: {points[0]['id']} - {points[-1]['id']})")
                
                points = []
        
        except Exception as e:
            print(f"  ❌ 处理图片失败 (ID: {image['id']}): {e}")
            continue
    
    # 验证迁移结果
    print("\n" + "=" * 60)
    print("迁移完成，验证结果...")
    
    info = qdrant.get_collection_info()
    if info:
        print(f"✓ Qdrant 集合信息:")
        print(f"  - 向量数量: {info['points_count']}")
        print(f"  - 向量维度: {info['config']['vector_size']}")
        print(f"  - 距离度量: {info['config']['distance']}")
    
    # 关闭数据库连接
    conn.close()
    
    print("=" * 60)
    print("✅ 迁移完成！")
    print("=" * 60)
    
    return True


def main():
    """主函数"""
    try:
        success = migrate_to_qdrant()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ 迁移失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

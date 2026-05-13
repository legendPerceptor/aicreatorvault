/**
 * Relationship-aware cluster layout for the knowledge graph.
 *
 * Strategy:
 * 1. Theme clusters: theme node at center, images in a ring around it,
 *    each image's prompt placed next to it. Ring radius grows with image count.
 * 2. Prompt-image pairs: prompt and its image placed close together,
 *    pairs arranged in a grid.
 * 3. Orphan nodes: placed in rows at the bottom.
 */

const NODE_WIDTH = 220;
const NODE_HEIGHT = 90;

// Theme cluster spacing
const BASE_RING_RADIUS = 350;
const PER_IMAGE_RADIUS_ADD = 30;
const CLUSTER_GAP_X = 600;

// Prompt-image pair spacing
const PAIR_GAP = 30;
const PAIR_GRID_COLS = 4;
const PAIR_GRID_GAP_X = 560;
const PAIR_GRID_GAP_Y = 200;

// Orphan spacing
const ORPHAN_GRID_COLS = 5;
const ORPHAN_GAP_X = 340;
const ORPHAN_GAP_Y = 180;

export function computeClusterLayout(apiNodes, apiEdges) {
  const positions = new Map();
  const nodeMap = new Map(apiNodes.map((n) => [String(n.id), n]));
  const nodeTypes = new Map(apiNodes.map((n) => [String(n.id), n.entityType]));

  const edgesBySource = new Map();
  const edgesByTarget = new Map();
  for (const e of apiEdges) {
    const s = String(e.source);
    const t = String(e.target);
    if (!edgesBySource.has(s)) edgesBySource.set(s, []);
    if (!edgesByTarget.has(t)) edgesByTarget.set(t, []);
    edgesBySource.get(s).push(e);
    edgesByTarget.get(t).push(e);
  }

  const assigned = new Set();

  // === Phase 1: Theme clusters ===
  const themeNodes = apiNodes.filter((n) => n.entityType === 'theme');

  // Pre-compute theme image counts to determine cluster sizes
  const themeData = themeNodes.map((theme) => {
    const containsEdges = (edgesBySource.get(String(theme.id)) || []).filter(
      (e) => e.type === 'contains'
    );
    const imageIds = containsEdges.map((e) => String(e.target));
    const ringRadius = BASE_RING_RADIUS + imageIds.length * PER_IMAGE_RADIUS_ADD;
    return { theme, imageIds, ringRadius, clusterWidth: ringRadius * 2 + NODE_WIDTH * 2 + 300 };
  });

  let clusterX = 0;

  themeData.forEach(({ theme, imageIds, ringRadius }) => {
    const themeId = String(theme.id);
    const cx = clusterX + ringRadius + NODE_WIDTH + 150;
    const cy = ringRadius + NODE_HEIGHT + 100;

    positions.set(themeId, { x: cx - NODE_WIDTH / 2, y: cy - NODE_HEIGHT / 2 });
    assigned.add(themeId);

    const ringCount = imageIds.length;
    imageIds.forEach((imageId, i) => {
      if (assigned.has(imageId)) return;
      const angle = (2 * Math.PI * i) / Math.max(ringCount, 1) - Math.PI / 2;
      const ix = cx + ringRadius * Math.cos(angle);
      const iy = cy + ringRadius * Math.sin(angle);
      positions.set(imageId, { x: ix - NODE_WIDTH / 2, y: iy - NODE_HEIGHT / 2 });
      assigned.add(imageId);

      // Place this image's prompt outside the ring, further from center
      const promptEdge = (edgesByTarget.get(imageId) || []).find((e) => e.type === 'generated');
      if (promptEdge) {
        const promptId =
          nodeTypes.get(String(promptEdge.source)) === 'prompt'
            ? String(promptEdge.source)
            : String(promptEdge.target);
        if (!assigned.has(promptId) && nodeMap.has(promptId)) {
          // Push prompt outward from center, past the image
          const promptDist = ringRadius + NODE_WIDTH + PAIR_GAP + 40;
          const px = cx + promptDist * Math.cos(angle);
          const py = iy - NODE_HEIGHT / 2;
          positions.set(promptId, { x: px - NODE_WIDTH / 2, y: py });
          assigned.add(promptId);
        }
      }
    });

    // Advance cluster X by the full width of this cluster
    clusterX += ringRadius * 2 + NODE_WIDTH * 3 + 400;
  });

  // === Phase 2: Standalone prompt-image pairs ===
  // Account for prompts extending beyond the ring (ringRadius + NODE_WIDTH + PAIR_GAP + 40 + NODE_WIDTH)
  const maxThemeExtent =
    themeData.length > 0
      ? Math.max(...themeData.map((t) => t.ringRadius + NODE_WIDTH * 2 + PAIR_GAP + 40))
      : 0;
  const usedY = themeNodes.length > 0 ? maxThemeExtent + NODE_HEIGHT + 400 : 100;
  let pairIndex = 0;

  const generatedEdges = apiEdges.filter((e) => e.type === 'generated');

  for (const edge of generatedEdges) {
    const sourceId = String(edge.source);
    const targetId = String(edge.target);
    if (assigned.has(sourceId) && assigned.has(targetId)) continue;

    const promptId = nodeTypes.get(sourceId) === 'prompt' ? sourceId : targetId;
    const imageId = nodeTypes.get(sourceId) === 'image' ? sourceId : targetId;

    const col = pairIndex % PAIR_GRID_COLS;
    const row = Math.floor(pairIndex / PAIR_GRID_COLS);
    const baseX = col * PAIR_GRID_GAP_X + 100;
    const baseY = row * PAIR_GRID_GAP_Y + usedY;

    if (!assigned.has(imageId) && nodeMap.has(imageId)) {
      positions.set(imageId, { x: baseX, y: baseY });
      assigned.add(imageId);
    }
    if (!assigned.has(promptId) && nodeMap.has(promptId)) {
      positions.set(promptId, {
        x: baseX + NODE_WIDTH + PAIR_GAP,
        y: baseY + 10,
      });
      assigned.add(promptId);
    }

    pairIndex++;
  }

  // === Phase 3: Orphan nodes ===
  const orphans = apiNodes.filter((n) => !assigned.has(String(n.id)));
  if (orphans.length > 0) {
    const maxPairRows = Math.ceil(pairIndex / PAIR_GRID_COLS);
    const orphanStartY = usedY + maxPairRows * PAIR_GRID_GAP_Y + 100;

    orphans.forEach((node, i) => {
      const col = i % ORPHAN_GRID_COLS;
      const row = Math.floor(i / ORPHAN_GRID_COLS);
      positions.set(String(node.id), {
        x: col * ORPHAN_GAP_X + 100,
        y: orphanStartY + row * ORPHAN_GAP_Y,
      });
    });
  }

  return positions;
}

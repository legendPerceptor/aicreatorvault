const { GraphNode, GraphEdge, Image, Prompt, Theme, Resource, sequelize } = require('../models');
const { Op } = require('sequelize');

class GraphService {
  async getGraphData(filters = {}) {
    const { entity_types, relationship_types, limit = 1000 } = filters;

    const nodeWhere = {};
    if (entity_types && entity_types.length > 0) {
      nodeWhere.entity_type = { [Op.in]: entity_types };
    }

    const nodes = await GraphNode.findAll({
      where: nodeWhere,
      limit,
      order: [['created_at', 'DESC']],
    });

    if (nodes.length === 0) {
      return { nodes: [], edges: [] };
    }

    const nodeIds = nodes.map((n) => n.id);

    const edgeWhere = {};
    if (relationship_types && relationship_types.length > 0) {
      edgeWhere.relationship_type = { [Op.in]: relationship_types };
    }
    edgeWhere[Op.or] = [{ source_id: { [Op.in]: nodeIds } }, { target_id: { [Op.in]: nodeIds } }];

    const edges = await GraphEdge.findAll({ where: edgeWhere });

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const hydratedNodes = await this.hydrateNodes(nodes);

    const filteredEdges = edges
      .filter((e) => nodeMap.has(e.source_id) && nodeMap.has(e.target_id))
      .map((e) => this.edgeToGraphEdge(e));

    return { nodes: hydratedNodes, edges: filteredEdges };
  }

  async traverse(fromId, depth = 2, relationship_types = null) {
    const visited = new Set();
    const queue = [{ nodeId: fromId, currentDepth: 0 }];
    const nodeMap = new Map();
    const edges = [];

    const startNode = await GraphNode.findByPk(fromId);
    if (!startNode) {
      throw new Error(`GraphNode with ID ${fromId} not found`);
    }
    nodeMap.set(fromId, startNode);
    visited.add(fromId);

    while (queue.length > 0) {
      const { nodeId, currentDepth } = queue.shift();
      if (currentDepth >= depth) continue;

      const whereClause = {
        [Op.or]: [{ source_id: nodeId }, { target_id: nodeId }],
      };
      if (relationship_types && relationship_types.length > 0) {
        whereClause.relationship_type = { [Op.in]: relationship_types };
      }

      const rels = await GraphEdge.findAll({ where: whereClause });

      for (const rel of rels) {
        const neighborId = rel.source_id === nodeId ? rel.target_id : rel.source_id;

        if (!visited.has(neighborId)) {
          const neighbor = await GraphNode.findByPk(neighborId);
          if (neighbor) {
            visited.add(neighborId);
            nodeMap.set(neighborId, neighbor);
            queue.push({ nodeId: neighborId, currentDepth: currentDepth + 1 });
          }
        }

        const edgeKey = `${rel.source_id}-${rel.target_id}`;
        if (!edges.some((e) => e.key === edgeKey)) {
          edges.push(this.edgeToGraphEdge(rel));
        }
      }
    }

    const hydratedNodes = await this.hydrateNodes(Array.from(nodeMap.values()));
    return {
      nodes: hydratedNodes,
      edges,
      visited: Array.from(visited),
    };
  }

  async findShortestPath(source_id, target_id, relationship_types = null) {
    if (source_id === target_id) return [source_id];

    const visited = new Set();
    const queue = [[source_id]];
    visited.add(source_id);

    while (queue.length > 0) {
      const path = queue.shift();
      const currentNode = path[path.length - 1];

      const whereClause = {
        [Op.or]: [{ source_id: currentNode }, { target_id: currentNode }],
      };
      if (relationship_types && relationship_types.length > 0) {
        whereClause.relationship_type = { [Op.in]: relationship_types };
      }

      const rels = await GraphEdge.findAll({ where: whereClause });

      for (const rel of rels) {
        const neighborId = rel.source_id === currentNode ? rel.target_id : rel.source_id;

        if (neighborId === target_id) return [...path, neighborId];
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push([...path, neighborId]);
        }
      }
    }

    return null;
  }

  async getNeighbors(nodeId, relationship_types = null) {
    const whereClause = {
      [Op.or]: [{ source_id: nodeId }, { target_id: nodeId }],
    };
    if (relationship_types && relationship_types.length > 0) {
      whereClause.relationship_type = { [Op.in]: relationship_types };
    }

    const edges = await GraphEdge.findAll({ where: whereClause });

    const incoming = [];
    const outgoing = [];

    for (const edge of edges) {
      const neighborId = edge.source_id === nodeId ? edge.target_id : edge.source_id;
      const neighbor = await GraphNode.findByPk(neighborId);
      if (!neighbor) continue;

      const hydrated = (await this.hydrateNodes([neighbor]))[0];

      if (edge.target_id === nodeId) {
        incoming.push({ node: hydrated, relationship: this.edgeToGraphEdge(edge) });
      } else {
        outgoing.push({ node: hydrated, relationship: this.edgeToGraphEdge(edge) });
      }
    }

    return { incoming, outgoing, all: [...incoming, ...outgoing] };
  }

  async getConnectedComponents() {
    const allNodes = await GraphNode.findAll();
    const visited = new Set();
    const components = [];

    for (const node of allNodes) {
      if (visited.has(node.id)) continue;

      const component = [];
      const queue = [node.id];
      visited.add(node.id);

      while (queue.length > 0) {
        const nodeId = queue.shift();
        component.push(nodeId);

        const rels = await GraphEdge.findAll({
          where: { [Op.or]: [{ source_id: nodeId }, { target_id: nodeId }] },
        });

        for (const rel of rels) {
          const neighborId = rel.source_id === nodeId ? rel.target_id : rel.source_id;
          if (!visited.has(neighborId)) {
            visited.add(neighborId);
            queue.push(neighborId);
          }
        }
      }

      components.push(component);
    }

    return components;
  }

  async getNodeDetails(nodeId) {
    const node = await GraphNode.findByPk(nodeId);
    if (!node) {
      throw new Error(`GraphNode with ID ${nodeId} not found`);
    }

    const edges = await GraphEdge.findAll({
      where: { [Op.or]: [{ source_id: nodeId }, { target_id: nodeId }] },
    });

    const hydrated = (await this.hydrateNodes([node]))[0];

    return {
      node: hydrated,
      relationships: edges.map((e) => this.edgeToGraphEdge(e)),
    };
  }

  async hydrateNodes(nodes) {
    if (nodes.length === 0) return [];

    const byType = { prompt: [], image: [], theme: [], resource: [] };
    for (const n of nodes) {
      if (byType[n.entity_type]) {
        byType[n.entity_type].push(n.entity_id);
      }
    }

    const [prompts, images, themes, resources] = await Promise.all([
      byType.prompt.length > 0
        ? Prompt.findAll({ where: { id: { [Op.in]: byType.prompt } }, raw: true })
        : [],
      byType.image.length > 0
        ? Image.findAll({ where: { id: { [Op.in]: byType.image } }, raw: true })
        : [],
      byType.theme.length > 0
        ? Theme.findAll({ where: { id: { [Op.in]: byType.theme } }, raw: true })
        : [],
      byType.resource.length > 0
        ? Resource.findAll({ where: { id: { [Op.in]: byType.resource } }, raw: true })
        : [],
    ]);

    const promptMap = new Map(prompts.map((p) => [p.id, p]));
    const imageMap = new Map(images.map((i) => [i.id, i]));
    const themeMap = new Map(themes.map((t) => [t.id, t]));
    const resourceMap = new Map(resources.map((r) => [r.id, r]));

    return nodes.map((node) => {
      const entity =
        node.entity_type === 'prompt'
          ? promptMap.get(node.entity_id)
          : node.entity_type === 'image'
            ? imageMap.get(node.entity_id)
            : node.entity_type === 'theme'
              ? themeMap.get(node.entity_id)
              : resourceMap.get(node.entity_id);

      return this.nodeToGraphNode(node, entity);
    });
  }

  nodeToGraphNode(node, entity) {
    const result = {
      id: node.id,
      entityType: node.entity_type,
      entityId: node.entity_id,
      label: this.computeLabel(node.entity_type, entity),
      entity: entity || null,
    };

    if (node.entity_type === 'image' && entity) {
      result.imageUrl = entity.is_reference
        ? `/api/files/reference/${entity.filename}`
        : `/api/files/${entity.user_id}/images/${entity.filename}`;
    }

    return result;
  }

  computeLabel(entityType, entity) {
    if (!entity) return `Unknown #${entityType}`;
    switch (entityType) {
      case 'prompt': {
        const content = entity.content || '';
        return content.length > 30 ? content.substring(0, 30) + '...' : content;
      }
      case 'image':
        return entity.filename || `Image #${entity.id}`;
      case 'theme':
        return entity.name || `Theme #${entity.id}`;
      case 'resource':
        return entity.title || entity.url || `Resource #${entity.id}`;
      default:
        return `Node #${entity.id}`;
    }
  }

  edgeToGraphEdge(edge) {
    return {
      id: edge.id,
      key: `${edge.source_id}-${edge.target_id}`,
      source: edge.source_id,
      target: edge.target_id,
      type: edge.relationship_type,
      label: this.getEdgeLabel(edge.relationship_type),
      properties: edge.properties,
    };
  }

  getEdgeLabel(relationship_type) {
    const labels = {
      generated: 'generated',
      derived_from: 'derived from',
      version_of: 'version of',
      inspired_by: 'inspired by',
      contains: 'contains',
    };
    return labels[relationship_type] || relationship_type;
  }

  async createRelationship(source_id, target_id, relationship_type, properties = {}) {
    const [source, target] = await Promise.all([
      GraphNode.findByPk(source_id),
      GraphNode.findByPk(target_id),
    ]);

    if (!source) throw new Error(`Source node with ID ${source_id} not found`);
    if (!target) throw new Error(`Target node with ID ${target_id} not found`);

    const existing = await GraphEdge.findOne({
      where: { source_id, target_id, relationship_type },
    });
    if (existing) {
      throw new Error(
        `Relationship already exists between ${source_id} and ${target_id} of type ${relationship_type}`
      );
    }

    const edge = await GraphEdge.create({
      user_id: source.user_id,
      source_id,
      target_id,
      relationship_type,
      properties,
    });

    return this.edgeToGraphEdge(edge);
  }

  async deleteRelationship(relationshipId) {
    const edge = await GraphEdge.findByPk(relationshipId);
    if (!edge) throw new Error(`Relationship with ID ${relationshipId} not found`);
    await edge.destroy();
    return true;
  }

  async getGraphStats() {
    const [nodeCount, edgeCount, nodesByType, edgesByType] = await Promise.all([
      GraphNode.count(),
      GraphEdge.count(),
      GraphNode.findAll({
        attributes: ['entity_type', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['entity_type'],
        raw: true,
      }),
      GraphEdge.findAll({
        attributes: ['relationship_type', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['relationship_type'],
        raw: true,
      }),
    ]);

    return {
      totalNodes: nodeCount,
      totalEdges: edgeCount,
      nodesByType: nodesByType.reduce((acc, item) => {
        acc[item.entity_type] = parseInt(item.count);
        return acc;
      }, {}),
      edgesByType: edgesByType.reduce((acc, item) => {
        acc[item.relationship_type] = parseInt(item.count);
        return acc;
      }, {}),
    };
  }
}

module.exports = new GraphService();

const { Asset, AssetRelationship, sequelize } = require('../models');
const { Op } = require('sequelize');

class GraphService {
  /**
   * Get all nodes and edges for the graph visualization
   * @param {Object} filters - Filters for asset types and relationship types
   * @returns {Object} - { nodes: [], edges: [] }
   */
  async getGraphData(filters = {}) {
    const { asset_types, relationship_types, limit = 1000 } = filters;

    // Build where clause for assets
    const assetWhere = {};
    if (asset_types && asset_types.length > 0) {
      assetWhere.asset_type = { [Op.in]: asset_types };
    }

    // Fetch assets (nodes)
    const assets = await Asset.findAll({
      where: assetWhere,
      limit,
      order: [['created_at', 'DESC']],
    });

    // Build map for quick lookups
    const assetMap = new Map();
    assets.forEach((asset) => {
      assetMap.set(asset.id, asset);
    });

    // Fetch relationships
    const relationshipWhere = {};
    if (relationship_types && relationship_types.length > 0) {
      relationshipWhere.relationship_type = { [Op.in]: relationship_types };
    }

    // Only include relationships where both assets exist
    const assetIds = Array.from(assetMap.keys());
    if (assetIds.length === 0) {
      return { nodes: [], edges: [] };
    }

    const relationships = await AssetRelationship.findAll({
      where: {
        ...relationshipWhere,
        [Op.or]: [{ sourceId: { [Op.in]: assetIds } }, { targetId: { [Op.in]: assetIds } }],
      },
    });

    // Transform to graph format
    const nodes = assets.map((asset) => this.assetToGraphNode(asset));
    const edges = relationships
      .filter((rel) => assetMap.has(rel.sourceId) && assetMap.has(rel.targetId))
      .map((rel) => this.relationshipToGraphEdge(rel));

    return { nodes, edges };
  }

  /**
   * Traverse the graph from a starting node using BFS
   * @param {number} fromId - Starting asset ID
   * @param {number} depth - Maximum depth to traverse (default: 2)
   * @param {Array} relationship_types - Filter by relationship types
   * @returns {Object} - { nodes: [], edges: [], visited: Set }
   */
  async traverse(fromId, depth = 2, relationship_types = null) {
    const visited = new Set();
    const queue = [{ nodeId: fromId, currentDepth: 0 }];
    const nodes = new Map();
    const edges = [];

    // Get starting node
    const startNode = await Asset.findByPk(fromId);
    if (!startNode) {
      throw new Error(`Asset with ID ${fromId} not found`);
    }
    nodes.set(fromId, this.assetToGraphNode(startNode));
    visited.add(fromId);

    while (queue.length > 0) {
      const { nodeId, currentDepth } = queue.shift();

      if (currentDepth >= depth) continue;

      // Get neighbors
      const whereClause = {
        [Op.or]: [{ sourceId: nodeId }, { targetId: nodeId }],
      };

      if (relationship_types && relationship_types.length > 0) {
        whereClause.relationship_type = { [Op.in]: relationship_types };
      }

      const relationships = await AssetRelationship.findAll({
        where: whereClause,
        include: [
          { model: Asset, as: 'source' },
          { model: Asset, as: 'target' },
        ],
      });

      for (const rel of relationships) {
        const neighborId = rel.sourceId === nodeId ? rel.targetId : rel.sourceId;
        const neighbor = rel.sourceId === nodeId ? rel.target : rel.source;

        if (neighbor && !visited.has(neighborId)) {
          visited.add(neighborId);
          nodes.set(neighborId, this.assetToGraphNode(neighbor));
          queue.push({ nodeId: neighborId, currentDepth: currentDepth + 1 });
        }

        // Add edge if not already added
        const edgeKey = `${rel.sourceId}-${rel.targetId}`;
        if (!edges.some((e) => e.key === edgeKey)) {
          edges.push(this.relationshipToGraphEdge(rel));
        }
      }
    }

    return {
      nodes: Array.from(nodes.values()),
      edges,
      visited: Array.from(visited),
    };
  }

  /**
   * Find shortest path between two assets using BFS
   * @param {number} sourceId - Source asset ID
   * @param {number} targetId - Target asset ID
   * @param {Array} relationship_types - Filter by relationship types
   * @returns {Array} - Array of asset IDs representing the path
   */
  async findShortestPath(sourceId, targetId, relationship_types = null) {
    if (sourceId === targetId) {
      return [sourceId];
    }

    const visited = new Set();
    const queue = [[sourceId]];
    visited.add(sourceId);

    while (queue.length > 0) {
      const path = queue.shift();
      const currentNode = path[path.length - 1];

      // Get neighbors
      const whereClause = {
        [Op.or]: [{ sourceId: currentNode }, { targetId: currentNode }],
      };

      if (relationship_types && relationship_types.length > 0) {
        whereClause.relationship_type = { [Op.in]: relationship_types };
      }

      const relationships = await AssetRelationship.findAll({
        where: whereClause,
      });

      for (const rel of relationships) {
        const neighborId = rel.sourceId === currentNode ? rel.targetId : rel.sourceId;

        if (neighborId === targetId) {
          return [...path, neighborId];
        }

        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push([...path, neighborId]);
        }
      }
    }

    return null; // No path found
  }

  /**
   * Get direct neighbors of a node
   * @param {number} nodeId - Asset ID
   * @param {Array} relationship_types - Filter by relationship types
   * @returns {Object} - { incoming: [], outgoing: [], all: [] }
   */
  async getNeighbors(nodeId, relationship_types = null) {
    const whereClause = {
      [Op.or]: [{ sourceId: nodeId }, { targetId: nodeId }],
    };

    if (relationship_types && relationship_types.length > 0) {
      whereClause.relationship_type = { [Op.in]: relationship_types };
    }

    const relationships = await AssetRelationship.findAll({
      where: whereClause,
      include: [
        { model: Asset, as: 'source' },
        { model: Asset, as: 'target' },
      ],
    });

    const incoming = [];
    const outgoing = [];

    for (const rel of relationships) {
      const neighbor = rel.sourceId === nodeId ? rel.target : rel.source;
      const neighborData = this.assetToGraphNode(neighbor);

      if (rel.targetId === nodeId) {
        incoming.push({
          node: neighborData,
          relationship: this.relationshipToGraphEdge(rel),
        });
      } else {
        outgoing.push({
          node: neighborData,
          relationship: this.relationshipToGraphEdge(rel),
        });
      }
    }

    return {
      incoming,
      outgoing,
      all: [...incoming, ...outgoing],
    };
  }

  /**
   * Get connected components in the graph
   * @returns {Array} - Array of components, each containing node IDs
   */
  async getConnectedComponents() {
    const allAssets = await Asset.findAll();
    const visited = new Set();
    const components = [];

    for (const asset of allAssets) {
      if (visited.has(asset.id)) continue;

      // Start a new component with BFS
      const component = [];
      const queue = [asset.id];
      visited.add(asset.id);

      while (queue.length > 0) {
        const nodeId = queue.shift();
        component.push(nodeId);

        // Get neighbors
        const relationships = await AssetRelationship.findAll({
          where: {
            [Op.or]: [{ sourceId: nodeId }, { targetId: nodeId }],
          },
        });

        for (const rel of relationships) {
          const neighborId = rel.sourceId === nodeId ? rel.targetId : rel.sourceId;
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

  /**
   * Get node details with all relationships
   * @param {number} nodeId - Asset ID
   * @returns {Object} - Node details with relationships
   */
  async getNodeDetails(nodeId) {
    const asset = await Asset.findByPk(nodeId);
    if (!asset) {
      throw new Error(`Asset with ID ${nodeId} not found`);
    }

    const relationships = await AssetRelationship.findAll({
      where: {
        [Op.or]: [{ sourceId: nodeId }, { targetId: nodeId }],
      },
      include: [
        { model: Asset, as: 'source' },
        { model: Asset, as: 'target' },
      ],
    });

    return {
      node: this.assetToGraphNode(asset),
      relationships: relationships.map((rel) => this.relationshipToGraphEdge(rel)),
    };
  }

  /**
   * Convert Asset model to graph node format
   * @private
   */
  assetToGraphNode(asset) {
    return {
      id: asset.id,
      type: asset.asset_type,
      label: this.getNodeLabel(asset),
      data: {
        filename: asset.filename,
        path: asset.path,
        score: asset.score,
        description: asset.description,
        metadata: asset.metadata,
        created_at: asset.created_at,
      },
    };
  }

  /**
   * Generate a human-readable label for a node
   * @private
   */
  getNodeLabel(asset) {
    switch (asset.asset_type) {
      case 'prompt': {
        const content = asset.content || '';
        return content.length > 30 ? content.substring(0, 30) + '...' : content;
      }
      case 'image':
      case 'derived_image':
        return asset.filename || `Image #${asset.id}`;
      default:
        return `Asset #${asset.id}`;
    }
  }

  /**
   * Convert AssetRelationship model to graph edge format
   * @private
   */
  relationshipToGraphEdge(relationship) {
    return {
      id: relationship.id,
      key: `${relationship.sourceId}-${relationship.targetId}`,
      source: relationship.sourceId,
      target: relationship.targetId,
      type: relationship.relationship_type,
      label: this.getEdgeLabel(relationship.relationship_type),
      properties: relationship.properties,
    };
  }

  /**
   * Get human-readable label for edge type
   * @private
   */
  getEdgeLabel(relationship_type) {
    const labels = {
      generated: 'generated',
      derived_from: 'derived from',
      version_of: 'version of',
      inspired_by: 'inspired by',
    };
    return labels[relationship_type] || relationship_type;
  }

  /**
   * Create a new relationship between assets
   * @param {number} sourceId - Source asset ID
   * @param {number} targetId - Target asset ID
   * @param {string} relationship_type - Type of relationship
   * @param {Object} properties - Additional properties
   * @returns {Object} - Created relationship
   */
  async createRelationship(sourceId, targetId, relationship_type, properties = {}) {
    // Check if both assets exist
    const [source, target] = await Promise.all([
      Asset.findByPk(sourceId),
      Asset.findByPk(targetId),
    ]);

    if (!source) {
      throw new Error(`Source asset with ID ${sourceId} not found`);
    }
    if (!target) {
      throw new Error(`Target asset with ID ${targetId} not found`);
    }

    // Check if relationship already exists
    const existing = await AssetRelationship.findOne({
      where: { sourceId, targetId, relationship_type },
    });

    if (existing) {
      throw new Error(
        `Relationship already exists between ${sourceId} and ${targetId} of type ${relationship_type}`
      );
    }

    const relationship = await AssetRelationship.create({
      sourceId,
      targetId,
      relationship_type,
      properties,
    });

    return this.relationshipToGraphEdge(relationship);
  }

  /**
   * Delete a relationship
   * @param {number} relationshipId - Relationship ID
   * @returns {boolean} - True if deleted
   */
  async deleteRelationship(relationshipId) {
    const relationship = await AssetRelationship.findByPk(relationshipId);
    if (!relationship) {
      throw new Error(`Relationship with ID ${relationshipId} not found`);
    }

    await relationship.destroy();
    return true;
  }

  /**
   * Get statistics about the graph
   * @returns {Object} - Graph statistics
   */
  async getGraphStats() {
    const [assetCount, relationshipCount, assetsByType, relationshipsByType] = await Promise.all([
      Asset.count(),
      AssetRelationship.count(),
      Asset.findAll({
        attributes: ['asset_type', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['asset_type'],
        raw: true,
      }),
      AssetRelationship.findAll({
        attributes: ['relationship_type', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['relationship_type'],
        raw: true,
      }),
    ]);

    return {
      totalNodes: assetCount,
      totalEdges: relationshipCount,
      nodesByType: assetsByType.reduce((acc, item) => {
        acc[item.asset_type] = parseInt(item.count);
        return acc;
      }, {}),
      edgesByType: relationshipsByType.reduce((acc, item) => {
        acc[item.relationship_type] = parseInt(item.count);
        return acc;
      }, {}),
    };
  }
}

module.exports = new GraphService();

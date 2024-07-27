import networkx as nx
from typing import List, Dict, Any, Tuple
import json

def create_graph_from_entities_and_relationships(entities: List[Dict[str, Any]], relationships: List[Dict[str, Any]]) -> nx.Graph:
    """
    Create a NetworkX graph from a list of entities and relationships.
    
    :param entities: List of entity dictionaries
    :param relationships: List of relationship dictionaries
    :return: NetworkX graph
    """
    G = nx.Graph()
    
    for entity in entities:
        G.add_node(entity['id'], **entity)
    
    for relationship in relationships:
        G.add_edge(relationship['source'], relationship['target'], **relationship)
    
    return G

def merge_graphs(graphs: List[nx.Graph]) -> nx.Graph:
    """
    Merge multiple graphs into a single graph.
    
    :param graphs: List of NetworkX graphs
    :return: Merged NetworkX graph
    """
    merged_graph = nx.Graph()
    
    for graph in graphs:
        merged_graph.update(graph)
    
    return merged_graph

def prune_graph(G: nx.Graph, max_nodes: int) -> nx.Graph:
    """
    Prune a graph to a maximum number of nodes, keeping the most connected nodes.
    
    :param G: Input NetworkX graph
    :param max_nodes: Maximum number of nodes to keep
    :return: Pruned NetworkX graph
    """
    if len(G) <= max_nodes:
        return G
    
    centrality = nx.degree_centrality(G)
    sorted_nodes = sorted(centrality, key=centrality.get, reverse=True)
    nodes_to_keep = sorted_nodes[:max_nodes]
    
    return G.subgraph(nodes_to_keep).copy()

def graph_to_json(G: nx.Graph) -> str:
    """
    Convert a NetworkX graph to a JSON string.
    
    :param G: NetworkX graph
    :return: JSON string representation of the graph
    """
    data = nx.node_link_data(G)
    return json.dumps(data)

def json_to_graph(json_str: str) -> nx.Graph:
    """
    Convert a JSON string to a NetworkX graph.
    
    :param json_str: JSON string representation of the graph
    :return: NetworkX graph
    """
    data = json.loads(json_str)
    return nx.node_link_graph(data)

def find_shortest_path(G: nx.Graph, source: str, target: str) -> List[str]:
    """
    Find the shortest path between two nodes in the graph.
    
    :param G: NetworkX graph
    :param source: Source node ID
    :param target: Target node ID
    :return: List of node IDs representing the shortest path
    """
    try:
        return nx.shortest_path(G, source, target)
    except nx.NetworkXNoPath:
        return []

def get_subgraph_around_node(G: nx.Graph, node_id: str, depth: int) -> nx.Graph:
    """
    Get a subgraph centered around a specific node up to a certain depth.
    
    :param G: NetworkX graph
    :param node_id: ID of the central node
    :param depth: Depth of the subgraph
    :return: Subgraph as a NetworkX graph
    """
    nodes = set([node_id])
    for _ in range(depth):
        neighbors = set()
        for node in nodes:
            neighbors.update(G.neighbors(node))
        nodes.update(neighbors)
    
    return G.subgraph(nodes).copy()

def get_graph_statistics(G: nx.Graph) -> Dict[str, Any]:
    """
    Get basic statistics about the graph.
    
    :param G: NetworkX graph
    :return: Dictionary of graph statistics
    """
    return {
        "num_nodes": G.number_of_nodes(),
        "num_edges": G.number_of_edges(),
        "avg_degree": sum(dict(G.degree()).values()) / G.number_of_nodes(),
        "density": nx.density(G),
        "is_connected": nx.is_connected(G),
        "num_connected_components": nx.number_connected_components(G)
    }

def serialize_graph(G: nx.Graph) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Serialize a NetworkX graph into lists of entities and relationships.
    
    :param G: NetworkX graph
    :return: Tuple of (entities, relationships)
    """
    entities = [
        {"id": node, **G.nodes[node]}
        for node in G.nodes
    ]
    
    relationships = [
        {"source": u, "target": v, **G.edges[u, v]}
        for u, v in G.edges
    ]
    
    return entities, relationships

def deserialize_graph(entities: List[Dict[str, Any]], relationships: List[Dict[str, Any]]) -> nx.Graph:
    """
    Deserialize lists of entities and relationships into a NetworkX graph.
    
    :param entities: List of entity dictionaries
    :param relationships: List of relationship dictionaries
    :return: NetworkX graph
    """
    return create_graph_from_entities_and_relationships(entities, relationships)


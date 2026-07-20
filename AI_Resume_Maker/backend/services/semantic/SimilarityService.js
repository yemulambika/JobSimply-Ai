/**
 * Similarity Service - Computes semantic similarity using cosine similarity
 * Modular design: can swap similarity metrics without changing the interface
 */

class SimilarityService {
  /**
   * Compute cosine similarity between two vectors
   * @param {number[]} vecA - First vector
   * @param {number[]} vecB - Second vector
   * @returns {number} - Cosine similarity score (0 to 1)
   */
  cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) {
      throw new Error('Vectors must be non-null and of equal length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Compute Euclidean distance between two vectors
   * @param {number[]} vecA - First vector
   * @param {number[]} vecB - Second vector
   * @returns {number} - Euclidean distance
   */
  euclideanDistance(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) {
      throw new Error('Vectors must be non-null and of equal length');
    }

    let sum = 0;
    for (let i = 0; i < vecA.length; i++) {
      sum += (vecA[i] - vecB[i]) ** 2;
    }

    return Math.sqrt(sum);
  }

  /**
   * Convert Euclidean distance to similarity score (0 to 1)
   * @param {number} distance - Euclidean distance
   * @param {number} maxDistance - Maximum expected distance
   * @returns {number} - Similarity score
   */
  distanceToSimilarity(distance, maxDistance = 2) {
    return Math.max(0, 1 - distance / maxDistance);
  }

  /**
   * Compute similarity between two text embeddings
   * @param {number[]} embeddingA - First embedding
   * @param {number[]} embeddingB - Second embedding
   * @param {string} metric - Similarity metric ('cosine' or 'euclidean')
   * @returns {number} - Similarity score (0 to 1)
   */
  computeSimilarity(embeddingA, embeddingB, metric = 'cosine') {
    if (metric === 'euclidean') {
      const distance = this.euclideanDistance(embeddingA, embeddingB);
      return this.distanceToSimilarity(distance);
    }

    return this.cosineSimilarity(embeddingA, embeddingB);
  }

  /**
   * Find best match from a list of embeddings
   * @param {number[]} queryEmbedding - Query embedding
   * @param {number[][]} candidateEmbeddings - List of candidate embeddings
   * @param {string} metric - Similarity metric
   * @returns {object} - Best match with index and score
   */
  findBestMatch(queryEmbedding, candidateEmbeddings, metric = 'cosine') {
    if (!candidateEmbeddings || candidateEmbeddings.length === 0) {
      return { index: -1, score: 0, embedding: null };
    }

    let bestIndex = -1;
    let bestScore = -1;
    let bestEmbedding = null;

    for (let i = 0; i < candidateEmbeddings.length; i++) {
      const score = this.computeSimilarity(queryEmbedding, candidateEmbeddings[i], metric);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
        bestEmbedding = candidateEmbeddings[i];
      }
    }

    return { index: bestIndex, score: bestScore, embedding: bestEmbedding };
  }

  /**
   * Find all matches above a threshold
   * @param {number[]} queryEmbedding - Query embedding
   * @param {number[][]} candidateEmbeddings - List of candidate embeddings
   * @param {number} threshold - Minimum similarity threshold (0 to 1)
   * @param {string} metric - Similarity metric
   * @returns {Array} - Array of matches with indices and scores
   */
  findMatchesAboveThreshold(queryEmbedding, candidateEmbeddings, threshold = 0.7, metric = 'cosine') {
    if (!candidateEmbeddings || candidateEmbeddings.length === 0) {
      return [];
    }

    const matches = [];
    for (let i = 0; i < candidateEmbeddings.length; i++) {
      const score = this.computeSimilarity(queryEmbedding, candidateEmbeddings[i], metric);
      if (score >= threshold) {
        matches.push({ index: i, score, embedding: candidateEmbeddings[i] });
      }
    }

    return matches.sort((a, b) => b.score - a.score);
  }

  /**
   * Compute similarity matrix between two sets of embeddings
   * @param {number[][]} embeddingsA - First set of embeddings
   * @param {number[][]} embeddingsB - Second set of embeddings
   * @param {string} metric - Similarity metric
   * @returns {number[][]} - Similarity matrix
   */
  computeSimilarityMatrix(embeddingsA, embeddingsB, metric = 'cosine') {
    if (!embeddingsA || !embeddingsB) {
      throw new Error('Embedding sets must be non-null');
    }

    const matrix = [];
    for (const embA of embeddingsA) {
      const row = [];
      for (const embB of embeddingsB) {
        row.push(this.computeSimilarity(embA, embB, metric));
      }
      matrix.push(row);
    }

    return matrix;
  }

  /**
   * Compute average similarity between two sets of embeddings
   * @param {number[][]} embeddingsA - First set of embeddings
   * @param {number[][]} embeddingsB - Second set of embeddings
   * @param {string} metric - Similarity metric
   * @returns {number} - Average similarity score
   */
  computeAverageSimilarity(embeddingsA, embeddingsB, metric = 'cosine') {
    if (!embeddingsA || !embeddingsB || embeddingsA.length === 0 || embeddingsB.length === 0) {
      return 0;
    }

    const matrix = this.computeSimilarityMatrix(embeddingsA, embeddingsB, metric);
    let sum = 0;
    let count = 0;

    for (const row of matrix) {
      for (const score of row) {
        sum += score;
        count++;
      }
    }

    return count > 0 ? sum / count : 0;
  }

  /**
   * Compute maximum similarity between two sets of embeddings
   * @param {number[][]} embeddingsA - First set of embeddings
   * @param {number[][]} embeddingsB - Second set of embeddings
   * @param {string} metric - Similarity metric
   * @returns {number} - Maximum similarity score
   */
  computeMaxSimilarity(embeddingsA, embeddingsB, metric = 'cosine') {
    if (!embeddingsA || !embeddingsB || embeddingsA.length === 0 || embeddingsB.length === 0) {
      return 0;
    }

    const matrix = this.computeSimilarityMatrix(embeddingsA, embeddingsB, metric);
    let maxScore = 0;

    for (const row of matrix) {
      for (const score of row) {
        if (score > maxScore) {
          maxScore = score;
        }
      }
    }

    return maxScore;
  }
}

// Singleton instance
let similarityServiceInstance = null;

/**
 * Get or create the similarity service singleton
 */
export function getSimilarityService() {
  if (!similarityServiceInstance) {
    similarityServiceInstance = new SimilarityService();
  }
  return similarityServiceInstance;
}

export default SimilarityService;

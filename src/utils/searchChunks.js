import {Chunk} from '../models/Chunk.js';

const SIMILARITY_THRESHOLD = 0.75;

export async function searchChunks(documentId, queryEmbedding,limit = 5) {
    const results = await Chunk.aggregate([
        {
            $vectorSearch: {
                index: 'chunk_vector_index',
                path: 'embedding',
                queryVector: queryEmbedding,
                numCandidates: 100,
                limit,
            },
        },
        {
            $match: {documentId,},
        },
        {
            $project: {
                text: 1,
                chunkIndex: 1,
                score: {$meta: 'vectorSearchScore'},
            },
        },
    ]);

    return results.filter(result => result.score >= SIMILARITY_THRESHOLD);
}

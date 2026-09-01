import mongoose from 'mongoose';

const chunkSchema = new mongoose.Schema({
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true,
    index: true,
  },
  text: { type: String, required: true },
  chunkIndex: { type: Number, required: true },
  embedding: {
    type: [Number],
    required: true,
  },
});

export const Chunk = mongoose.model('Chunk', chunkSchema);
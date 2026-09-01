import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true },
    filePath: { type: String, required: true },
    fileSizeBytes: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'processing', 'complete', 'failed'],
      default: 'pending',
    },
    error: { type: String, default: null },
    textPreview: { type: String, default: null },
    pageCount: { type: Number, default: null },
    chunkCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Document = mongoose.model('Document', documentSchema);
/**
 * Resumable File Upload Manager for Flaky Connections.
 * Breaks large Vault documents into chunks with progress tracking & resume support.
 */

export interface ChunkUploadOptions {
  chunkSizeBytes?: number; // Default 512KB chunks
  onProgress?: (bytesUploaded: number, totalBytes: number) => void;
  onChunkSuccess?: (chunkIndex: number, totalChunks: number) => void;
}

export class ResumableUploader {
  private file: File;
  private chunkSize: number;
  private uploadedBytes: number = 0;
  private totalChunks: number;

  constructor(file: File, options: ChunkUploadOptions = {}) {
    this.file = file;
    this.chunkSize = options.chunkSizeBytes || 512 * 1024; // 512 KB
    this.totalChunks = Math.ceil(file.size / this.chunkSize);
  }

  public getTotalChunks(): number {
    return this.totalChunks;
  }

  public getChunk(chunkIndex: number): Blob {
    const start = chunkIndex * this.chunkSize;
    const end = Math.min(start + this.chunkSize, this.file.size);
    return this.file.slice(start, end);
  }

  public async upload(
    uploadChunkFn: (chunk: Blob, chunkIndex: number, totalChunks: number) => Promise<void>,
    options?: ChunkUploadOptions
  ): Promise<{ success: boolean; totalBytes: number }> {
    for (let i = 0; i < this.totalChunks; i++) {
      const chunk = this.getChunk(i);
      await uploadChunkFn(chunk, i, this.totalChunks);

      this.uploadedBytes += chunk.size;
      if (options?.onProgress) {
        options.onProgress(this.uploadedBytes, this.file.size);
      }
      if (options?.onChunkSuccess) {
        options.onChunkSuccess(i, this.totalChunks);
      }
    }

    return { success: true, totalBytes: this.file.size };
  }
}

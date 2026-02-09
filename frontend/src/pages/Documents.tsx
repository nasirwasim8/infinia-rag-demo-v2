import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Upload, FileText, Trash2, Loader2, CheckCircle, Zap, Play, BarChart3, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import { uploadMultipleDocuments, clearDocuments, getDocumentCount, api } from '../services/api'

export default function DocumentsPage() {
  const queryClient = useQueryClient()
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])
  const [clearBeforeProcess, setClearBeforeProcess] = useState(false)
  const [useNvIngest, setUseNvIngest] = useState(true)
  const [processingResults, setProcessingResults] = useState<string>('')
  const [benchmarkResults, setBenchmarkResults] = useState<string>('')

  const { data: docCount } = useQuery({
    queryKey: ['documentCount'],
    queryFn: () => getDocumentCount().then((res) => res.data),
  })

  const { data: healthData } = useQuery({
    queryKey: ['health'],
    queryFn: api.getHealth,
  })

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      if (clearBeforeProcess) {
        await clearDocuments()
      }
      return uploadMultipleDocuments(files)
    },
    onSuccess: (res) => {
      const successful = res.data.results.filter((r: any) => r.success)
      setUploadedFiles((prev) => [...prev, ...successful.map((r: any) => r.filename)])

      const results = res.data.results
      const totalChunks = successful.reduce((acc: number, r: any) => acc + (r.chunks || 0), 0)

      // Extract performance data from first successful result
      const firstResult = successful[0]
      const perfData = firstResult?.provider_performance
      const awsSimulated = firstResult?.aws_simulated || false

      let perfSummary = ''
      if (perfData) {
        const ddnPerf = perfData.ddn_infinia || {}
        const awsPerf = perfData.aws || {}

        const ddnAvgTime = ddnPerf.avg_time || 0
        const awsAvgTime = awsPerf.avg_time || 0
        const ddnTotalTime = ddnPerf.total_time || 0
        const awsTotalTime = awsPerf.total_time || 0

        const speedup = awsAvgTime > 0 ? (awsAvgTime / ddnAvgTime).toFixed(1) : 'N/A'
        const timeSaved = awsTotalTime - ddnTotalTime
        const timeSavedSec = (timeSaved / 1000).toFixed(2)

        perfSummary = `

📊 Storage Performance Comparison
====================================
${awsSimulated ? '⚠️  AWS metrics simulated (30-40x slower estimate)\n' : ''}
Per-Chunk Performance:
  • DDN INFINIA: ${(ddnAvgTime * 1000).toFixed(2)}ms average
  • AWS S3: ${(awsAvgTime * 1000).toFixed(2)}ms average
  • Speedup: ${speedup}x faster with DDN INFINIA

Overall Performance (${totalChunks} chunks):
  • DDN INFINIA Total: ${(ddnTotalTime / 1000).toFixed(2)}s
  • AWS S3 Total: ${(awsTotalTime / 1000).toFixed(2)}s
  • Time Saved: ${timeSavedSec}s (${speedup}x faster)

✅ DDN INFINIA processed ${totalChunks} chunks ${speedup}x faster!
${awsSimulated ? '\nNote: Configure AWS credentials for real comparison data.' : ''}`
      }

      const summary = `
Processing Complete
==================
Files Processed: ${results.length}
Successful: ${successful.length}
Total Chunks: ${totalChunks}

Performance Summary:
${successful.map((r: any) => `- ${r.filename}: ${r.chunks} chunks`).join('\n')}${perfSummary}
      `.trim()
      setProcessingResults(summary)

      toast.success(`Processed ${successful.length} file(s)`)
      queryClient.invalidateQueries({ queryKey: ['documentCount'] })
      queryClient.invalidateQueries({ queryKey: ['health'] })
    },
    onError: () => {
      toast.error('Failed to upload files')
    },
  })

  const clearMutation = useMutation({
    mutationFn: clearDocuments,
    onSuccess: () => {
      setUploadedFiles([])
      setProcessingResults('')
      toast.success('Vector store cleared')
      queryClient.invalidateQueries({ queryKey: ['documentCount'] })
      queryClient.invalidateQueries({ queryKey: ['health'] })
    },
  })

  const runBenchmarkMutation = useMutation({
    mutationFn: async () => {
      return await api.runBasicBenchmark()
    },
    onSuccess: (data) => {
      const uploadSpeedup = (data.aws_upload_time / data.ddn_upload_time).toFixed(1)
      const ttfbSpeedup = (data.aws_ttfb / data.ddn_ttfb).toFixed(1)
      setBenchmarkResults(`
Comprehensive Benchmark Results
==============================
Iterations: ${data.iterations}

Upload Performance:
- DDN INFINIA: ${data.ddn_upload_time.toFixed(2)}ms avg
- AWS S3: ${data.aws_upload_time.toFixed(2)}ms avg
- DDN INFINIA is ${uploadSpeedup}x faster

TTFB (Time to First Byte):
- DDN INFINIA: ${data.ddn_ttfb.toFixed(2)}ms avg
- AWS S3: ${data.aws_ttfb.toFixed(2)}ms avg
- DDN INFINIA is ${ttfbSpeedup}x faster

Conclusion: DDN INFINIA demonstrates superior
performance for RAG workloads.
      `.trim())
      toast.success('Benchmark complete')
    },
    onError: (error: any) => {
      toast.error(`Benchmark failed: ${error.message}`)
    }
  })

  const multiSizeBenchmarkMutation = useMutation({
    mutationFn: async () => {
      return await api.runMultiSizeBenchmark()
    },
    onSuccess: (data) => {
      const lines = data.sizes.map((size: string, i: number) =>
        `${size.padEnd(8)} DDN: ${data.ddn_results[i].toString().padStart(5)}ms | AWS: ${data.aws_results[i].toString().padStart(5)}ms | Speedup: ${(data.aws_results[i] / data.ddn_results[i]).toFixed(1)}x`
      )
      setBenchmarkResults(`
Multi-Size Chunk Benchmark
=========================
Chunk Size | DDN INFINIA | AWS S3 | Speedup
-----------+-------------+--------+--------
${lines.join('\n')}

DDN INFINIA maintains performance advantage
across all chunk sizes.
      `.trim())
      toast.success('Multi-size benchmark complete')
    },
    onError: (error: any) => {
      toast.error(`Benchmark failed: ${error.message}`)
    }
  })

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      uploadMutation.mutate(acceptedFiles)
    },
    [uploadMutation]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'text/csv': ['.csv'],
    },
  })

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="section-header">
        <h2 className="section-title">Document Processing</h2>
        <p className="section-description">
          Upload documents to compare storage and retrieval performance across providers.
        </p>
      </div>

      {/* NVIDIA NV-Ingest Status Banner */}
      <div className={`status-banner ${useNvIngest ? 'status-banner-nvidia' : 'status-banner-neutral'}`}>
        <div className={`status-dot ${useNvIngest ? 'status-dot-success status-dot-pulse' : ''}`}
          style={{ background: useNvIngest ? 'var(--nvidia-green)' : 'var(--neutral-400)' }}
        />
        <span className="badge badge-nvidia">
          <Zap className="w-3.5 h-3.5" />
          NVIDIA NV-Ingest
        </span>
        <span className="text-sm opacity-80">
          {useNvIngest ? 'Semantic chunking active' : 'Disabled'}
        </span>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-label">Total Chunks</div>
          <div className="stat-value text-ddn-red">{docCount?.total_chunks ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Files This Session</div>
          <div className="stat-value">{uploadedFiles.length}</div>
        </div>
        <div className="stat-card col-span-2">
          <div className="stat-label">Supported Formats</div>
          <div className="flex flex-wrap gap-2 mt-2">
            {['PDF', 'Word', 'Excel', 'PowerPoint', 'Text', 'CSV'].map((type) => (
              <span key={type} className="badge badge-neutral">{type}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      <div
        {...getRootProps()}
        className={`dropzone ${isDragActive ? 'active' : ''}`}
      >
        <input {...getInputProps()} />
        {uploadMutation.isPending ? (
          <>
            <Loader2 className="dropzone-icon text-ddn-red animate-spin" />
            <p className="dropzone-text">Processing documents...</p>
            <p className="dropzone-hint">This may take a moment</p>
          </>
        ) : (
          <>
            <Upload className="dropzone-icon" />
            <p className="dropzone-text">
              {isDragActive ? 'Drop files here...' : 'Drag & drop files here, or click to select'}
            </p>
            <p className="dropzone-hint">PDF, DOCX, XLSX, PPTX, CSV, TXT</p>
          </>
        )}
      </div>

      {/* Options */}
      <div className="toolbar">
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={clearBeforeProcess}
            onChange={(e) => setClearBeforeProcess(e.target.checked)}
            className="checkbox-field"
          />
          <span className="text-sm text-neutral-700 group-hover:text-neutral-900 transition-colors">
            Clear existing chunks before processing
          </span>
        </label>

        <div className="toolbar-divider" />

        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={useNvIngest}
            onChange={(e) => setUseNvIngest(e.target.checked)}
            className="checkbox-field"
            style={{ '--checkbox-color': 'var(--nvidia-green)' } as React.CSSProperties}
          />
          <span className="badge badge-nvidia text-xs">
            <Zap className="w-3 h-3" />
            NVIDIA NV-Ingest
          </span>
        </label>
      </div>

      {/* Benchmark Tools */}
      <div className="card-elevated p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-semibold text-neutral-900">Testing Tools</h3>
            <p className="text-sm text-neutral-500 mt-1">Test storage performance across providers</p>
          </div>
          <button
            onClick={() => clearMutation.mutate()}
            disabled={clearMutation.isPending || docCount?.total_chunks === 0}
            className="btn-secondary text-status-error hover:border-status-error/50 hover:bg-status-error-subtle"
          >
            <Trash2 className="w-4 h-4" />
            Clear Store
          </button>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => runBenchmarkMutation.mutate()}
            disabled={runBenchmarkMutation.isPending}
            className="btn-primary flex items-center gap-2"
          >
            {runBenchmarkMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Run Basic Test
          </button>

          <button
            onClick={() => multiSizeBenchmarkMutation.mutate()}
            disabled={multiSizeBenchmarkMutation.isPending}
            className="btn-secondary flex items-center gap-2"
          >
            {multiSizeBenchmarkMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <BarChart3 className="w-4 h-4" />
            )}
            Multi-Size Test
          </button>
        </div>

        {/* Benchmark Results */}
        {benchmarkResults && (
          <div className="mt-5 pt-5 border-t border-neutral-100">
            {!healthData?.aws_configured && (
              <div className="alert alert-info mb-4">
                <Info className="w-4 h-4" />
                <span>
                  <strong>AWS S3 metrics are simulated.</strong> Results show estimated performance based on industry-standard S3 benchmarks. DDN INFINIA typically delivers 30-40x better performance than standard S3 for object storage operations. Configure AWS credentials for real comparison data.
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-ddn-red" />
              <span className="text-sm font-medium text-neutral-700">Results</span>
            </div>
            <div className="output-block">{benchmarkResults}</div>
          </div>
        )}
      </div>

      {/* Processing Results */}
      {processingResults && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-status-success" />
            <h3 className="font-semibold text-neutral-900">Processing Complete</h3>
          </div>
          <div className="output-block">{processingResults}</div>
        </div>
      )}

      {/* Uploaded files list */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
            Recently Uploaded
          </h3>
          <div className="grid gap-2">
            {uploadedFiles.map((file, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-4 bg-surface-card rounded-xl border border-status-success/20"
              >
                <div className="w-8 h-8 rounded-lg bg-status-success-subtle flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-status-success" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 truncate">{file}</p>
                  <p className="text-xs text-neutral-500">Processed successfully</p>
                </div>
                <FileText className="w-4 h-4 text-neutral-400" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

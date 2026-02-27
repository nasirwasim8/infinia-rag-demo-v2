import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Upload, FileText, Trash2, Loader2, CheckCircle, Zap, Play, BarChart3, Info, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { uploadMultipleDocuments, clearDocuments, getDocumentCount, api } from '../services/api'

// ── Scaling Chart Component (inline SVG, no extra dependencies) ───────────────
function ScalingChart({ scalePoints, ddnLatencies, awsLatencies, awsSimulated }: {
  scalePoints: number[]
  ddnLatencies: number[]
  awsLatencies: number[]
  awsSimulated: boolean
}) {
  const W = 520, H = 220
  const M = { top: 20, right: 20, bottom: 44, left: 68 }
  const cW = W - M.left - M.right
  const cH = H - M.top - M.bottom
  const maxY = Math.max(...awsLatencies, ...ddnLatencies) * 1.15
  const xS = (i: number) => (i / (scalePoints.length - 1)) * cW
  const yS = (v: number) => cH - (v / maxY) * cH
  const path = (vals: number[]) => vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${xS(i).toFixed(1)},${yS(v).toFixed(1)}`).join(' ')
  const gridCount = 4
  return (
    <div className="mt-4">
      <div className="flex items-center gap-8 mb-4 text-sm">
        <span className="flex items-center gap-2">
          <span className="inline-block w-6 h-0.5 bg-red-500 rounded" />
          <span className="font-semibold text-red-600">DDN INFINIA</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block w-6 border-t-2 border-dashed border-slate-400" />
          <span className="font-medium text-slate-500">AWS S3{awsSimulated ? ' (simulated)' : ''}</span>
        </span>
        <span className="ml-auto text-sm text-slate-400">Concurrent Requests →</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 220 }}>
        <g transform={`translate(${M.left},${M.top})`}>
          {/* Grid */}
          {Array.from({ length: gridCount + 1 }, (_, i) => {
            const v = (maxY / gridCount) * i
            const y = yS(v)
            return (
              <g key={i}>
                <line x1={0} y1={y} x2={cW} y2={y} stroke="#f1f5f9" strokeWidth={1} />
                <text x={-8} y={y + 4} textAnchor="end" fontSize={9} fill="#94a3b8">{Math.round(v)}</text>
              </g>
            )
          })}
          {/* X labels */}
          {scalePoints.map((p, i) => (
            <text key={i} x={xS(i)} y={cH + 16} textAnchor="middle" fontSize={9} fill="#94a3b8">{p}</text>
          ))}
          {/* Axes */}
          <line x1={0} y1={0} x2={0} y2={cH} stroke="#e2e8f0" strokeWidth={1} />
          <line x1={0} y1={cH} x2={cW} y2={cH} stroke="#e2e8f0" strokeWidth={1} />
          {/* AWS line (dashed gray) */}
          <path d={path(awsLatencies)} fill="none" stroke="#94a3b8" strokeWidth={2} strokeDasharray="6,3" />
          {/* DDN line (solid red) */}
          <path d={path(ddnLatencies)} fill="none" stroke="#dc2626" strokeWidth={2.5} />
          {/* DDN dots */}
          {ddnLatencies.map((v, i) => (
            <circle key={i} cx={xS(i)} cy={yS(v)} r={4} fill="#dc2626">
              <title>DDN INFINIA @ {scalePoints[i]} concurrent: {v}ms</title>
            </circle>
          ))}
          {/* AWS dots */}
          {awsLatencies.map((v, i) => (
            <circle key={i} cx={xS(i)} cy={yS(v)} r={4} fill="#94a3b8">
              <title>AWS S3 @ {scalePoints[i]} concurrent: {v.toFixed(1)}ms</title>
            </circle>
          ))}
          {/* Y-axis label */}
          <text x={-50} y={cH / 2} textAnchor="middle" fontSize={9} fill="#94a3b8"
            transform={`rotate(-90,-50,${cH / 2})`}>Latency (ms)</text>
        </g>
      </svg>
    </div>
  )
}

export default function DocumentsPage() {
  const queryClient = useQueryClient()
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])
  const [clearBeforeProcess, setClearBeforeProcess] = useState(false)
  const [useNvIngest, setUseNvIngest] = useState(true)
  const [processingResults, setProcessingResults] = useState<string>('')
  const [benchmarkResults, setBenchmarkResults] = useState<string>('')
  const [scalingData, setScalingData] = useState<{
    scale_points: number[]; ddn_latencies: number[]; aws_latencies: number[]; aws_simulated: boolean
  } | null>(null)

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

        // GPU embedding metrics
        const embeddingTimeMs = firstResult?.embedding_time_ms
        const embeddingDevice = firstResult?.embedding_device || 'cpu'
        const isGpu = embeddingDevice === 'cuda'
        const embeddingSection = embeddingTimeMs != null
          ? `\n⚡ Embedding Performance (${isGpu ? 'GPU — CUDA Accelerated' : 'CPU'})
====================================
  • Device: ${embeddingDevice.toUpperCase()}${isGpu ? ' 🚀' : ''}
  • Total embedding time: ${embeddingTimeMs.toFixed(1)}ms
  • Chunks per second: ${((totalChunks / embeddingTimeMs) * 1000).toFixed(0)} chunks/sec
  • Per-chunk avg: ${(embeddingTimeMs / Math.max(totalChunks, 1)).toFixed(1)}ms\n`
          : ''

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
${awsSimulated ? '\nNote: Configure AWS credentials for real comparison data.' : ''}${embeddingSection}`
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

  const scalingBenchmarkMutation = useMutation({
    mutationFn: async () => api.runScalingBenchmark(),
    onSuccess: (data) => {
      setScalingData(data)
      toast.success('📊 Scaling benchmark complete')
    },
    onError: (error: any) => {
      toast.error(`Scaling test failed: ${error.message}`)
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

          <button
            onClick={() => scalingBenchmarkMutation.mutate()}
            disabled={scalingBenchmarkMutation.isPending}
            className="btn-secondary flex items-center gap-2"
          >
            {scalingBenchmarkMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <TrendingUp className="w-4 h-4" />
            )}
            {scalingBenchmarkMutation.isPending ? 'Running Scaling Test...' : 'Scaling Test'}
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

      {/* Scaling Benchmark Chart */}
      {scalingData && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-5 h-5 text-ddn-red" />
            <h3 className="font-semibold text-neutral-900">DDN Doesn't Slow Down</h3>
            <span className="ml-auto text-xs text-neutral-400">
              {scalingData.aws_simulated ? 'AWS metrics simulated' : 'Real AWS data'}
            </span>
          </div>
          <p className="text-xs text-neutral-500 mb-4">
            GET latency at increasing concurrent request load — DDN INFINIA stays flat, S3 degrades
          </p>
          {scalingData.aws_simulated && (
            <div className="alert alert-info mb-4">
              <Info className="w-4 h-4" />
              <span><strong>AWS S3 metrics are simulated</strong> with realistic degradation model. Configure AWS credentials for real comparison data.</span>
            </div>
          )}
          <ScalingChart
            scalePoints={scalingData.scale_points}
            ddnLatencies={scalingData.ddn_latencies}
            awsLatencies={scalingData.aws_latencies}
            awsSimulated={scalingData.aws_simulated}
          />
          <div className="mt-5 grid grid-cols-2 gap-4 text-sm text-neutral-600">
            <div className="bg-red-50 rounded-lg p-4 border border-red-100">
              <div className="flex items-center gap-2 font-semibold text-red-700 mb-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <ellipse cx="12" cy="5" rx="9" ry="3" />
                  <path d="M3 5v6a9 3 0 0 0 18 0V5" />
                  <path d="M3 11v6a9 3 0 0 0 18 0v-6" />
                </svg>
                DDN INFINIA
              </div>
              <div className="text-base font-medium">Avg: {(scalingData.ddn_latencies.reduce((a, b) => a + b, 0) / scalingData.ddn_latencies.length).toFixed(1)}ms</div>
              <div className="text-base">Max: {Math.max(...scalingData.ddn_latencies).toFixed(1)}ms</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
              <div className="flex items-center gap-2 font-semibold text-slate-600 mb-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
                </svg>
                AWS S3
              </div>
              <div className="text-base font-medium">Avg: {(scalingData.aws_latencies.reduce((a, b) => a + b, 0) / scalingData.aws_latencies.length).toFixed(1)}ms</div>
              <div className="text-base">Max: {Math.max(...scalingData.aws_latencies).toFixed(1)}ms</div>
            </div>
          </div>

          {/* Business Outcome */}
          <div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 text-ddn-red flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                <polyline points="16 7 22 7 22 13" />
              </svg>
              <span className="text-sm font-semibold text-neutral-800">Business Outcome — Why Consistency Matters</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-neutral-600">
              <div className="bg-white rounded-lg p-3 border border-neutral-100">
                <div className="font-semibold text-neutral-800 mb-1">⚡ Predictable SLAs</div>
                <p>RAG pipelines chain retrieval → rerank → LLM. A spike at the storage layer ripples into every user’s response time. DDN’s flat latency curve means your p99 stays predictable — even under 50× concurrent load.</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-neutral-100">
                <div className="font-semibold text-neutral-800 mb-1">🧠 Maximum GPU Utilization</div>
                <p>When retrieval is fast and consistent, the GPU never waits for data. S3 latency spikes starve the GPU of context, wasting expensive compute cycles. DDN keeps the inference pipeline fed at full throughput.</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-neutral-100">
                <div className="font-semibold text-neutral-800 mb-1">🏭 Scale Without Re-Architecture</div>
                <p>As your RAG deployment grows from 10 to 500 concurrent users, DDN INFINIA holds its latency profile. S3 degrades — forcing costly re-architecture or throttling. DDN lets you scale PoC to production on day one.</p>
              </div>
            </div>
          </div>
        </div>
      )}

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

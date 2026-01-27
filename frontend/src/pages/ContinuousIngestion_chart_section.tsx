{/* Real-Time Performance Chart */ }
<div className="card-inset p-5">
    <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
            Real-Time Performance
        </h3>
        {currentFile && (
            <span className="text-xs text-neutral-400">
                {currentFile}
            </span>
        )}
    </div>

    {/* AWS Simulation Disclaimer */}
    {awsSimulated && (
        <div className="alert alert-info mb-4">
            <Info className="w-4 h-4" />
            <span>
                <strong>AWS metrics simulated.</strong> Estimated 30-40x slower. Configure AWS for real data.
            </span>
        </div>
    )}

    {chartData.length > 0 ? (
        <div className="space-y-3 max-h-80 overflow-y-auto">
            {chartData.slice(-10).map((point, i) => (
                <div key={i} className="space-y-2">
                    <div className="flex justify-between text-xs">
                        <span className="text-neutral-500">{point.chunk}</span>
                        <span className="text-neutral-400">{point.progress?.toFixed(0)}%</span>
                    </div>
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-ddn-red font-medium">DDN</span>
                                <span className="text-neutral-600">{point.ddn.toFixed(2)}ms</span>
                            </div>
                            <div className="h-2 bg-surface-secondary rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-ddn-red to-red-400 transition-all duration-300"
                                    style={{ width: `${Math.min((point.ddn / Math.max(point.ddn, point.aws)) * 100, 100)}%` }}
                                />
                            </div>
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-neutral-600 font-medium">AWS</span>
                                <span className="text-neutral-600">{point.aws.toFixed(2)}ms</span>
                            </div>
                            <div className="h-2 bg-surface-secondary rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-neutral-400 transition-all duration-300"
                                    style={{ width: `${Math.min((point.aws / Math.max(point.ddn, point.aws)) * 100, 100)}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    ) : (
        <div className="h-40 bg-surface-secondary rounded-xl flex items-center justify-center">
            <div className="text-center">
                <Zap className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                <p className="text-neutral-400 text-sm">
                    {isMonitoring ? 'Waiting for files...' : 'Start monitoring to see live performance'}
                </p>
            </div>
        </div>
    )}
</div>

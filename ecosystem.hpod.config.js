/**
 * PM2 Ecosystem Config — HyperPOD GPU Environment
 *
 * Server:   172.24.161.62
 * SSH:      ssh aidp@172.24.161.62
 * URL:      http://172.24.161.62:5173
 *
 * Usage:
 *   pm2 start ecosystem.hpod.config.js
 *   pm2 start ecosystem.hpod.config.js --only infinia-rag-backend
 *   pm2 start ecosystem.hpod.config.js --only infinia-rag-frontend
 *
 * Notes:
 *   - Uses __dirname for portable paths (works regardless of clone location)
 *   - Backend port: 8000, Frontend port: 5173
 *   - max_memory_restart: 4G (GPU + Qwen LLM + embeddings need headroom)
 */

const appDir = __dirname

module.exports = {
    apps: [
        {
            name: 'infinia-rag-backend',
            cwd: appDir + '/backend',
            script: appDir + '/backend/venv/bin/python',
            args: '-m uvicorn main:app --host 0.0.0.0 --port 8000',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '4G',   // GPU + LLM model needs more headroom
            env: {
                NODE_ENV: 'production',
                PYTHONUNBUFFERED: '1',
                TOKENIZERS_PARALLELISM: 'false',
                OMP_NUM_THREADS: '1',
            },
            error_file: appDir + '/logs/backend-error.log',
            out_file: appDir + '/logs/backend-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true
        },
        {
            name: 'infinia-rag-frontend',
            cwd: appDir + '/frontend',
            script: 'npm',
            args: 'run dev -- --host 0.0.0.0 --port 5173',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'production'
            },
            error_file: appDir + '/logs/frontend-error.log',
            out_file: appDir + '/logs/frontend-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true
        }
    ]
}

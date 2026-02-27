/**
 * PM2 Ecosystem Config — OCI Cloud Environment
 *
 * Server:   159.54.182.181
 * SSH:      ssh -i ~/.ssh/cluster1_key ubuntu@159.54.182.181
 * URL:      http://159.54.182.181:5174
 *
 * Usage:
 *   pm2 start ecosystem.oci.config.js
 *   pm2 start ecosystem.oci.config.js --only infinia-rag-backend
 *
 * Notes:
 *   - Uses __dirname for portable paths (works regardless of clone location)
 *   - Backend port: 8000, Frontend port: 5174
 *   - max_memory_restart: 2G
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
            max_memory_restart: '2G',
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
            args: 'run dev -- --host 0.0.0.0 --port 5174',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '500M',
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

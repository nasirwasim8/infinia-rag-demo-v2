"""
GPU detection and configuration utility.
"""
import logging

logger = logging.getLogger(__name__)


class GPUInfo:
    """Detect and manage GPU availability for the application."""
    
    def __init__(self):
        self._gpu_available = False
        self._device_name = "cpu"
        self._cuda_version = None
        self._gpu_count = 0
        self._gpu_names = []
        self._detect_gpu()
    
    def _detect_gpu(self):
        """Detect GPU availability and get device information."""
        try:
            import torch
            
            if torch.cuda.is_available():
                self._gpu_available = True
                self._device_name = "cuda"
                self._gpu_count = torch.cuda.device_count()
                self._cuda_version = torch.version.cuda
                
                # Get GPU names
                for i in range(self._gpu_count):
                    gpu_name = torch.cuda.get_device_name(i)
                    self._gpu_names.append(gpu_name)
                
                logger.info(f"🎮 GPU DETECTED: {self._gpu_count} GPU(s) available")
                for i, name in enumerate(self._gpu_names):
                    logger.info(f"   GPU {i}: {name}")
                logger.info(f"   CUDA Version: {self._cuda_version}")
            else:
                logger.info("💻 Running on CPU (No GPU detected)")
                
        except ImportError:
            logger.warning("⚠️  PyTorch not installed - GPU acceleration disabled")
        except Exception as e:
            logger.error(f"❌ Error detecting GPU: {e}")
    
    @property
    def is_available(self) -> bool:
        """Check if GPU is available."""
        return self._gpu_available
    
    @property
    def device_name(self) -> str:
        """Get device name (cuda or cpu)."""
        return self._device_name
    
    @property
    def gpu_count(self) -> int:
        """Get number of available GPUs."""
        return self._gpu_count
    
    @property
    def gpu_names(self) -> list:
        """Get list of GPU names."""
        return self._gpu_names
    
    @property
    def cuda_version(self) -> str:
        """Get CUDA version."""
        return self._cuda_version or "N/A"
    
    def get_device(self):
        """
        Get torch device object.
        Returns 'cuda' if GPU available, otherwise 'cpu'.
        """
        try:
            import torch
            return torch.device(self._device_name)
        except ImportError:
            return "cpu"
    
    def to_dict(self) -> dict:
        """Get GPU info as dictionary for API responses."""
        return {
            "gpu_available": self._gpu_available,
            "device": self._device_name,
            "gpu_count": self._gpu_count,
            "gpu_names": self._gpu_names,
            "cuda_version": self.cuda_version
        }


# Global GPU info instance
gpu_info = GPUInfo()

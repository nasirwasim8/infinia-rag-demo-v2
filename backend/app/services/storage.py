"""
Storage service for AWS S3 and DDN INFINIA.
Handles all object storage operations with both providers.
"""
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from typing import Optional, Tuple, List
import urllib3

from app.core.config import storage_config

# Disable SSL warnings for DDN INFINIA (self-signed certs)
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


class S3Handler:
    """Unified handler for AWS S3 and DDN INFINIA storage operations."""

    def __init__(self, config_type: str = 'aws'):
        self.config_type = config_type
        self.client = None
        self.config = None

    def create_client(self) -> Tuple[bool, str]:
        """Create S3 client based on configuration type."""
        try:
            print(f"DEBUG: Creating {self.config_type} client...")
            is_valid, message = storage_config.validate_config(self.config_type)
            if not is_valid:
                error_msg = f"Invalid {self.config_type} configuration: {message}"
                print(f"DEBUG: {error_msg}")
                return False, error_msg
            
            print(f"DEBUG: Configuration valid for {self.config_type}")

            if self.config_type == 'aws':
                self.config = storage_config.aws_config
                print(f"DEBUG: Initializing basic boto3 client for AWS...")
                self.client = boto3.client(
                    's3',
                    aws_access_key_id=self.config['access_key'],
                    aws_secret_access_key=self.config['secret_key'],
                    region_name=self.config['region']
                )
            elif self.config_type == 'ddn_infinia':
                self.config = storage_config.ddn_infinia_config
                print(f"DEBUG: Initializing boto3 client for DDN (endpoint: {self.config.get('endpoint_url')})...")

                boto_config = Config(
                    signature_version='s3v4',
                    s3={'addressing_style': 'path'},
                    retries={'max_attempts': 3},
                    connect_timeout=60,
                    read_timeout=60
                )

                self.client = boto3.client(
                    's3',
                    aws_access_key_id=self.config['access_key'],
                    aws_secret_access_key=self.config['secret_key'],
                    endpoint_url=self.config['endpoint_url'],
                    region_name=self.config['region'],
                    config=boto_config,
                    verify=False  # DDN INFINIA uses self-signed certs
                )
            else:
                error_msg = f"Unsupported config type: {self.config_type}"
                print(error_msg)
                return False, error_msg

            print(f"DEBUG: Client created successfully for {self.config_type}")
            return True, "Client created successfully"
        except Exception as e:
            error_msg = f"Error creating {self.config_type} S3 client: {e}"
            print(error_msg)
            import traceback
            traceback.print_exc()
            return False, error_msg

    def _ensure_client(self) -> Tuple[bool, str]:
        """Ensure client is initialized."""
        if not self.client:
            return self.create_client()
        return True, "Client already initialized"

    def upload_bytes(self, data_bytes: bytes, object_key: str) -> Tuple[bool, str]:
        """Upload bytes data to S3 bucket."""
        success, message = self._ensure_client()
        if not success:
            return False, f"Failed to create S3 client: {message}"

        try:
            bucket_name = self.config['bucket_name']
            self.client.put_object(Bucket=bucket_name, Key=object_key, Body=data_bytes)
            return True, f"Successfully uploaded to {self.config['provider']}"
        except Exception as e:
            return False, f"Upload error: {e}"

    def download_bytes(self, object_key: str) -> Tuple[Optional[bytes], str]:
        """Download bytes data from S3 bucket."""
        success, message = self._ensure_client()
        if not success:
            return None, f"Failed to create S3 client: {message}"

        try:
            bucket_name = self.config['bucket_name']
            response = self.client.get_object(Bucket=bucket_name, Key=object_key)
            return response['Body'].read(), f"Successfully downloaded from {self.config['provider']}"
        except Exception as e:
            return None, f"Download error: {e}"

    def upload_file(self, file_path: str, object_key: str) -> Tuple[bool, str]:
        """Upload file to S3 bucket."""
        success, message = self._ensure_client()
        if not success:
            return False, f"Failed to create S3 client: {message}"

        try:
            bucket_name = self.config['bucket_name']
            self.client.upload_file(file_path, bucket_name, object_key)
            return True, f"Successfully uploaded to {self.config['provider']}"
        except Exception as e:
            return False, f"Upload error: {e}"

    def download_file(self, object_key: str, file_path: str) -> Tuple[bool, str]:
        """Download file from S3 bucket."""
        success, message = self._ensure_client()
        if not success:
            return False, f"Failed to create S3 client: {message}"

        try:
            bucket_name = self.config['bucket_name']
            self.client.download_file(bucket_name, object_key, file_path)
            return True, f"Successfully downloaded from {self.config['provider']}"
        except Exception as e:
            return False, f"Download error: {e}"

    def list_objects(self, prefix: str = "") -> Tuple[List[dict], str]:
        """List objects in S3 bucket."""
        success, message = self._ensure_client()
        if not success:
            return [], f"Failed to create S3 client: {message}"

        try:
            bucket_name = self.config['bucket_name']
            response = self.client.list_objects_v2(Bucket=bucket_name, Prefix=prefix)
            objects = response.get('Contents', [])
            return objects, f"Successfully listed objects from {self.config['provider']}"
        except Exception as e:
            return [], f"List error: {e}"

    def delete_object(self, object_key: str) -> Tuple[bool, str]:
        """Delete object from S3 bucket."""
        success, message = self._ensure_client()
        if not success:
            return False, f"Failed to create S3 client: {message}"

        try:
            bucket_name = self.config['bucket_name']
            self.client.delete_object(Bucket=bucket_name, Key=object_key)
            return True, f"Successfully deleted from {self.config['provider']}"
        except Exception as e:
            return False, f"Delete error: {e}"

    def test_connection(self) -> Tuple[bool, str]:
        """Test connection to storage provider."""
        success, message = self._ensure_client()
        if not success:
            return False, f"Failed to create client: {message}"

        try:
            bucket_name = self.config['bucket_name']
            self.client.head_bucket(Bucket=bucket_name)
            return True, f"Successfully connected to {self.config['provider']}"
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', 'Unknown')
            return False, f"Connection failed ({error_code}): {e}"
        except Exception as e:
            return False, f"Connection error: {e}"

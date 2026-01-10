import httpx
import base64
from pathlib import Path
from typing import Optional
from ...config import settings, logger
from ...exceptions import GitHubError
from .interface import StorageProviderInterface

class GitHubStorageProvider(StorageProviderInterface):
    """
    GitHub-based document storage implementation.
    
    Architecture: Hierarchical folder structure
    - Active: {GITHUB_DOCUMENTS_PATH}/{doc_id}/{filename}
    - Archived: {GITHUB_ARCHIVED_PATH}/{doc_id}/{filename}
    - Files are physically moved when archived/restored
    - Provides versioning and audit trail via Git commits
    """
    
    def __init__(self):
        self.token = settings.GITHUB_TOKEN
        self.branch = settings.GITHUB_BRANCH
        self.docs_repo = settings.GITHUB_DOCS_REPO or settings.GITHUB_REPO

    def _headers(self):
        return {
            "Accept": "application/vnd.github.v3+json",
            "Authorization": f"Bearer {self.token}",
            "User-Agent": "Admin-Backend"
        }

    async def _get_sha(self, repo: str, path: str) -> Optional[str]:
        try:
            async with httpx.AsyncClient(timeout=settings.HTTP_CLIENT_TIMEOUT) as client:
                r = await client.get(
                    f"https://api.github.com/repos/{repo}/contents/{path}?ref={self.branch}",
                    headers=self._headers()
                )
                return r.json().get("sha") if r.status_code == 200 else None
        except Exception as e:
            logger.error(f"Failed to get SHA: {e}")
            return None

    async def upload_file(self, doc_id: str, filename: str, content: bytes, message: str) -> dict:
        if not self.docs_repo:
            raise GitHubError("Repo not configured")
        safe_filename = Path(filename).name
        path = f"{settings.GITHUB_DOCUMENTS_PATH}/{doc_id}/{safe_filename}"
        sha = await self._get_sha(self.docs_repo, path)
        url = f"https://api.github.com/repos/{self.docs_repo}/contents/{path}"
        data = {
            "message": message,
            "content": base64.b64encode(content).decode('utf-8'),
            "branch": self.branch
        }
        if sha:
            data["sha"] = sha
        async with httpx.AsyncClient(timeout=settings.HTTP_CLIENT_TIMEOUT) as client:
            r = await client.put(url, headers=self._headers(), json=data)
            if r.status_code not in [200, 201]:
                raise GitHubError(f"Upload failed with status {r.status_code}")
            res = r.json().get("content", {})
            return {
                "storage_path": path,
                "storage_sha": res.get("sha"),
                "storage_url": res.get("html_url")
            }

    async def download_file(self, doc_id: str, filename: str, archived: bool = False) -> Optional[bytes]:
        if not self.docs_repo:
            raise GitHubError("Repo not configured")
        base = settings.GITHUB_ARCHIVED_PATH if archived else settings.GITHUB_DOCUMENTS_PATH
        safe_filename = Path(filename).name
        path = f"{base}/{doc_id}/{safe_filename}"
        async with httpx.AsyncClient(timeout=settings.HTTP_CLIENT_TIMEOUT) as client:
            r = await client.get(
                f"https://api.github.com/repos/{self.docs_repo}/contents/{path}?ref={self.branch}",
                headers=self._headers()
            )
            if r.status_code == 404:
                return None
            if r.status_code != 200:
                raise GitHubError(f"Fetch failed with status {r.status_code}")
            return base64.b64decode(r.json().get("content", "").replace("\n", ""))

    async def delete_file(self, doc_id: str, filename: str, archived: bool, message: str) -> bool:
        if not self.docs_repo:
            raise GitHubError("Repo not configured")
        base = settings.GITHUB_ARCHIVED_PATH if archived else settings.GITHUB_DOCUMENTS_PATH
        safe_filename = Path(filename).name
        path = f"{base}/{doc_id}/{safe_filename}"
        sha = await self._get_sha(self.docs_repo, path)
        if not sha:
            return False
        url = f"https://api.github.com/repos/{self.docs_repo}/contents/{path}"
        data = {"message": message, "sha": sha, "branch": self.branch}
        async with httpx.AsyncClient(timeout=settings.HTTP_CLIENT_TIMEOUT) as client:
            r = await client.delete(url, headers=self._headers(), json=data)
            return r.status_code == 200

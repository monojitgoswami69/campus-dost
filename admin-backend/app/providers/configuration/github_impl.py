import httpx
import base64
from typing import Optional
from ...config import settings, logger
from ...exceptions import GitHubError
from .interface import ConfigProviderInterface

class GitHubConfigProvider(ConfigProviderInterface):
    """GitHub-based system instructions storage."""
    
    def __init__(self):
        self.token = settings.GITHUB_TOKEN
        self.branch = settings.GITHUB_BRANCH
        self.sys_repo = settings.GITHUB_REPO

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

    async def get_instructions(self) -> dict:
        if not self.sys_repo:
            raise GitHubError("Repo not configured")
        path = settings.GITHUB_SYS_INS_PATH
        async with httpx.AsyncClient(timeout=settings.HTTP_CLIENT_TIMEOUT) as client:
            r = await client.get(
                f"https://api.github.com/repos/{self.sys_repo}/contents/{path}?ref={self.branch}",
                headers=self._headers()
            )
            if r.status_code == 404:
                return {"content": "", "commit": None}
            if r.status_code != 200:
                raise GitHubError(f"Fetch failed with status {r.status_code}")
            data = r.json()
            content = base64.b64decode(data.get("content", "").replace("\n", "")).decode('utf-8')
            return {"content": content, "commit": data.get("sha")}

    async def save_instructions(self, content: str, message: str) -> dict:
        if not self.sys_repo:
            raise GitHubError("Repo not configured")
        path = settings.GITHUB_SYS_INS_PATH
        sha = await self._get_sha(self.sys_repo, path)
        url = f"https://api.github.com/repos/{self.sys_repo}/contents/{path}"
        data = {
            "message": message,
            "content": base64.b64encode(content.encode('utf-8')).decode('utf-8'),
            "branch": self.branch
        }
        if sha:
            data["sha"] = sha
        async with httpx.AsyncClient(timeout=settings.HTTP_CLIENT_TIMEOUT) as client:
            r = await client.put(url, headers=self._headers(), json=data)
            if r.status_code not in [200, 201]:
                raise GitHubError(f"Save failed with status {r.status_code}")
            res = r.json().get("commit", {})
            return {"commit": res.get("sha"), "success": True}

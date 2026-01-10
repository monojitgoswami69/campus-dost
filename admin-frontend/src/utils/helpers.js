export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatRelativeTime(dateString) {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  
  // Check if date is valid
  if (isNaN(date.getTime())) return 'N/A';
  
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  return date.toLocaleDateString();
}

export function formatDateTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function validateFile(file, maxSize = 25 * 1024 * 1024) {
  const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.txt', '.webp', '.md', '.json'];
  
  const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  
  if (!allowedExtensions.includes(fileExtension)) {
    return { valid: false, error: 'File type not supported' };
  }
  
  if (file.size > maxSize) {
    return { valid: false, error: `File size exceeds ${formatBytes(maxSize)} limit` };
  }
  
  return { valid: true };
}

export function getFileIcon(type) {
  const icons = {
    pdf: 'FileText',
    text: 'FileText',
    image: 'Image',
    document: 'File'
  };
  return icons[type] || 'File';
}

export function getStatusColor(status) {
  const colors = {
    embedded: 'success',
    pending: 'warning',
    error: 'danger'
  };
  return colors[status] || 'neutral';
}

export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function checkServerHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, { method: "GET" });
    return res.ok;
  } catch (e) {
    return false;
  }
}

export async function fetchWithStatus(url, options = {}) {
  try {
    const res = await fetch(url, options);
    return { ok: true, response: res };
  } catch (err) {
    // Network error or server down
    const isServerUp = await checkServerHealth();
    if (!isServerUp) {
      return { ok: false, error: "Server offline or not communicating", type: "server_offline" };
    }
    return { ok: false, error: err.message, type: "fetch_error" };
  }
}

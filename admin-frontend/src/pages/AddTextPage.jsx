import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { FileText, Upload, Loader2 } from 'lucide-react';

const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } }
};

const cardVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2 } }
};

export default function AddTextPage() {
  const [text, setText] = useState('');
  const [filename, setFilename] = useState('');
  const { addToast, updateToast } = useToast();

  const handleUpload = async () => {
    if (!text.trim()) return;

    let finalFilename;
    if (filename.trim()) {
      finalFilename = filename.trim().endsWith('.txt') ? filename.trim() : `${filename.trim()}.txt`;
    } else {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + Date.now();
      finalFilename = `text_${timestamp}.txt`;
    }

    const textContent = text;
    setText('');
    setFilename('');

    const toastId = addToast({
      action: 'Uploading',
      fileName: finalFilename,
      status: 'uploading',
      progress: 0,
    });

    try {
      updateToast(toastId, { status: 'uploading', progress: 30 });
      await api.text.upload(finalFilename, textContent);
      updateToast(toastId, { status: 'complete', action: 'Uploaded', progress: 100 });
    } catch (err) {
      updateToast(toastId, {
        status: 'error',
        action: 'Upload failed',
        message: err.message || 'Failed to upload text',
      });
      setText(textContent);
    }
  };

  return (
    <motion.div
      className="h-full flex flex-col gap-4"
      variants={pageVariants}
      initial="initial"
      animate="animate"
    >
      <motion.div
        className="flex-1 min-h-0 bg-white rounded-lg border border-neutral-200 flex flex-col overflow-hidden"
        variants={cardVariants}
      >
        <div className="p-3 border-b border-neutral-200 flex items-center gap-3 bg-neutral-50 flex-shrink-0">
          <input
            type="text"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            placeholder="Filename (optional)"
            className="flex-1 min-w-0 px-3 py-2 text-[14px] border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <button
            onClick={handleUpload}
            disabled={!text.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-[13px] font-semibold transition-colors tracking-tight"
          >
            <Upload className="w-4 h-4" />
            <span>Upload</span>
          </button>
        </div>

        <div className="flex-1 relative min-h-0">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="absolute inset-0 w-full h-full p-4 resize-none focus:outline-none font-mono text-[14px] leading-relaxed text-neutral-900 bg-white placeholder-neutral-400"
            placeholder="Paste your content here..."
          />
        </div>

        <div className="px-4 py-2 bg-neutral-50 border-t border-neutral-200 text-[11px] text-neutral-500 text-right flex-shrink-0 font-medium tracking-wide">
          {text.length} characters
        </div>
      </motion.div>
    </motion.div>
  );
}

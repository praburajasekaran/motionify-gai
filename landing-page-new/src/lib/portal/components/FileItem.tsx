'use client';

import React, { useState, useContext } from 'react';
import { ProjectFile } from '@/lib/portal/types';
import Button from './ui/Button';
import { AppContext } from '@/lib/portal/AppContext';
import { timeAgo, formatDate } from '@/lib/portal/utils/dateUtils';

interface FileItemProps {
  file: ProjectFile;
}

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const getFileIcon = (fileType: string) => {
  if (fileType.startsWith('image/')) return '🖼️';
  if (fileType.startsWith('video/')) return '🎬';
  if (fileType === 'application/pdf') return '📄';
  if (fileType.includes('zip') || fileType.includes('archive')) return '📦';
  return '📁';
};

const FileItem: React.FC<FileItemProps> = ({ file }) => {
  const { renameFile, addFileComment } = useContext(AppContext);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(file.name);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [isCommentsVisible, setIsCommentsVisible] = useState(false);
  const [newComment, setNewComment] = useState('');

  // Fix Bug #3: Use timezone-safe date formatting
  const uploadDate = formatDate(file.uploadedAt);

  const handleDownload = () => {
    const fileContent = `This is a mock file for: ${file.name}\nSize: ${file.size} bytes\nType: ${file.type}`;
    const blob = new Blob([fileContent], { type: file.type || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', file.name);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleRename = () => {
    setRenameError(null);
    if (newName.trim() && newName.trim() !== file.name) {
      const result = renameFile(file.id, newName.trim());
      if (!result.success && result.error) {
        setRenameError(result.error);
        return; // Keep editing mode open to fix the error
      }
    }
    setIsEditing(false);
  };

  const handleStartEditing = () => {
    setNewName(file.name);
    setRenameError(null);
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    setNewName(file.name);
    setRenameError(null);
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      addFileComment(file.id, newComment.trim());
      setNewComment('');
    }
  }

  return (
    <div className="p-4 bg-white/10 backdrop-blur border border-white/10 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
        <div className="flex items-start gap-4 flex-grow w-full">
          <span className="text-2xl mt-1">{getFileIcon(file.type)}</span>
          <div className="flex-grow">
            {isEditing ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => { setNewName(e.target.value); setRenameError(null); }}
                    className={`block w-full shadow-sm sm:text-sm bg-white/5 border rounded-lg text-white px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 ${renameError ? 'border-red-500' : 'border-white/10'}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename();
                      if (e.key === 'Escape') handleCancelEditing();
                    }}
                    autoFocus
                  />
                  <Button onClick={handleRename} className="px-3 py-1.5 text-xs">Save</Button>
                  <Button onClick={handleCancelEditing} variant="secondary" className="px-3 py-1.5 text-xs">Cancel</Button>
                </div>
                {renameError && (
                  <p className="text-xs text-red-400">{renameError}</p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <p className="font-semibold text-white">{file.name}</p>
                <button onClick={handleStartEditing} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-white/10 text-white/70">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                  <span className="sr-only">Rename file</span>
                </button>
              </div>
            )}
            <p className="text-xs text-white/60">
              {formatBytes(file.size)} &bull; Uploaded {uploadDate}
            </p>
            {file.description && (
              <p className="mt-2 text-sm text-white/70 bg-white/5 p-3 rounded-lg whitespace-pre-wrap">
                {file.description}
              </p>
            )}
          </div>
        </div>
        <Button
          variant="secondary"
          onClick={handleDownload}
          className="mt-3 sm:mt-0 sm:ml-4 flex-shrink-0 self-end sm:self-center"
        >
          Download
        </Button>
      </div>

      <div className="mt-3 pt-3 border-t border-white/10">
        <button onClick={() => setIsCommentsVisible(!isCommentsVisible)} className="flex items-center text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span>Comments ({file.comments.length})</span>
        </button>

        {isCommentsVisible && (
          <div className="mt-3 space-y-4">
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {file.comments.length > 0 ? file.comments.map(comment => (
                <div key={comment.id} className="text-sm bg-white/5 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <p className="font-semibold text-white">{comment.userName}</p>
                    <p className="text-xs text-white/40">{timeAgo(comment.timestamp)}</p>
                  </div>
                  <p className="mt-1 text-white/70 whitespace-pre-wrap">{comment.content}</p>
                </div>
              )) : (
                <p className="text-sm text-white/60">No comments yet.</p>
              )}
            </div>

            <form onSubmit={handleCommentSubmit} className="flex items-start space-x-2">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment on this file..."
                rows={2}
                className="mt-1 block w-full shadow-sm sm:text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 px-3 py-2"
                required
              />
              <Button type="submit" className="flex-shrink-0 mt-1">Post</Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileItem;


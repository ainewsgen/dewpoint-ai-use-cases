import React, { useState, useEffect } from 'react';
import {
    Upload,
    Trash2,
    Plus,
    Loader2,
    Edit
} from 'lucide-react';

interface Document {
    id: number;
    name: string;
    type: string;
    content: string;
    description?: string;
    fileName?: string;
    fileType?: string;
    isPublished: boolean;
    downloadCount?: number;
    createdAt: string;
}

export function DocumentManager() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [editingDoc, setEditingDoc] = useState<Document | null>(null);

    // Form State
    const [newDoc, setNewDoc] = useState({
        name: '',
        type: 'Report',
        content: '',
        description: '',
        fileName: '',
        fileType: ''
    });

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        try {
            const token = localStorage.getItem('dpg_auth_token');
            const res = await fetch('/api/admin/documents', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setDocuments(data.documents);
            }
        } catch (error) {
            console.error("Fetch documents failed", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadstart = () => setIsUploading(true);
        reader.onprogress = () => { };
        reader.onload = () => {
            setNewDoc({
                ...newDoc,
                content: reader.result as string,
                fileName: file.name,
                fileType: file.type
            });
            setIsUploading(false);
        };
        reader.readAsDataURL(file);
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDoc.name || !newDoc.content) {
            alert("Please provide a name and select a file.");
            return;
        }

        try {
            const token = localStorage.getItem('dpg_auth_token');
            const res = await fetch('/api/admin/documents', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newDoc)
            });

            if (res.ok) {
                fetchDocuments();
                setNewDoc({ name: '', type: 'Report', content: '', description: '', fileName: '', fileType: '' });
                // Reset file input
                const fileInput = document.getElementById('file-upload') as HTMLInputElement;
                if (fileInput) fileInput.value = '';
            } else {
                const errData = await res.json().catch(() => ({}));
                alert(`Upload failed: ${errData.error || res.statusText}${errData.details ? ` (${errData.details})` : ''}`);
            }
        } catch (error) {
            console.error("Upload failed", error);
            alert("Upload failed. Please check the console for details or ensure you are logged in correctly.");
        }
    };

    const togglePublish = async (id: number, currentStatus: boolean) => {
        try {
            const token = localStorage.getItem('dpg_auth_token');
            await fetch(`/api/admin/documents/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ isPublished: !currentStatus })
            });
            fetchDocuments();
        } catch (error) {
            console.error("Toggle publish failed", error);
            alert("Failed to update status.");
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingDoc) return;

        try {
            const token = localStorage.getItem('dpg_auth_token');
            const res = await fetch(`/api/admin/documents/${editingDoc.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: editingDoc.name,
                    type: editingDoc.type,
                    description: editingDoc.description
                })
            });

            if (res.ok) {
                setEditingDoc(null);
                fetchDocuments();
            } else {
                const errData = await res.json().catch(() => ({}));
                alert(`Update failed: ${errData.error || res.statusText}`);
            }
        } catch (error) {
            console.error("Update failed", error);
            alert("Update failed. Please check the console.");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this document?")) return;

        try {
            const token = localStorage.getItem('dpg_auth_token');
            await fetch(`/api/admin/documents/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchDocuments();
        } catch (error) {
            console.error("Delete failed", error);
            alert("Failed to delete document.");
        }
    };

    return (
        <div style={{ padding: '0.5rem' }}>
            {/* Upload Section */}
            <div style={{
                background: 'hsla(var(--bg-card)/0.5)',
                border: '1px solid var(--border-glass)',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '2rem'
            }}>
                <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Plus size={18} className="text-accent" />
                    New Resource / Document
                </h3>
                <form onSubmit={handleUpload} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
                    <div className="input-group">
                        <label style={{ fontSize: '0.75rem', marginBottom: '0.25rem', display: 'block' }}>Display Name</label>
                        <input
                            type="text"
                            className="admin-input"
                            placeholder="e.g. AI Strategy Roadmap Guide"
                            value={newDoc.name}
                            onChange={(e) => setNewDoc({ ...newDoc, name: e.target.value })}
                        />
                    </div>
                    <div className="input-group">
                        <label style={{ fontSize: '0.75rem', marginBottom: '0.25rem', display: 'block' }}>Resource Type</label>
                        <select
                            className="admin-input"
                            value={newDoc.type}
                            onChange={(e) => setNewDoc({ ...newDoc, type: e.target.value })}
                        >
                            <option value="Report">Report</option>
                            <option value="Implementation Guide">Implementation Guide</option>
                            <option value="Case Study">Case Study</option>
                            <option value="Cheat Sheet">Cheat Sheet</option>
                        </select>
                    </div>
                    <div className="input-group">
                        <label
                            htmlFor="file-upload"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.65rem 1rem',
                                background: 'hsla(var(--accent-primary)/0.1)',
                                border: '1px dashed hsla(var(--accent-primary)/0.5)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                color: 'hsl(var(--accent-primary))',
                                transition: 'all 0.2s'
                            }}
                        >
                            {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                            {newDoc.fileName ? newDoc.fileName : 'Choose File (PDF, DOCX)'}
                            <input id="file-upload" type="file" hidden onChange={handleFileChange} />
                        </label>
                    </div>
                    <div style={{ gridColumn: 'span 3' }}>
                        <textarea
                            placeholder="Document Description (Visible to users on the roadmap)..."
                            value={newDoc.description || ''}
                            onChange={(e) => setNewDoc({ ...newDoc, description: e.target.value })}
                            className="admin-textarea"
                            style={{ width: '100%', minHeight: '80px', fontSize: '0.85rem', background: '#f8fafc' }}
                        />
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                            💡 Tip: If you leave this blank, AI will generate a description for you after upload.
                        </p>
                    </div>
                    <button
                        type="submit"
                        disabled={!newDoc.name || !newDoc.content}
                        className="btn-primary"
                        style={{ gridColumn: 'span 3', padding: '0.75rem' }}
                    >
                        Upload Document
                    </button>
                </form>
            </div>

            {/* List Section */}
            <div className="admin-table-container">
                {isLoading ? (
                    <div style={{ padding: '2rem', textAlign: 'center' }}>
                        <Loader2 className="animate-spin" />
                    </div>
                ) : documents.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No documents uploaded yet.
                    </div>
                ) : (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Type</th>
                                <th>File</th>
                                <th>Downloads</th>
                                <th>Uploaded</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {documents.map((doc) => (
                                <tr key={doc.id}>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{doc.name}</div>
                                    </td>
                                    <td>
                                        <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: 'hsla(var(--bg-card)/0.8)', borderRadius: '4px' }}>
                                            {doc.type}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                            {doc.fileName || 'N/A'}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 600, textAlign: 'center' }}>
                                            {doc.downloadCount || 0}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            {new Date(doc.createdAt).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{
                                                fontSize: '0.7rem',
                                                padding: '0.2rem 0.5rem',
                                                borderRadius: '4px',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                background: doc.isPublished ? 'hsla(var(--accent-primary)/0.1)' : 'rgba(255,255,255,0.05)',
                                                color: doc.isPublished ? 'hsl(var(--accent-primary))' : 'var(--text-muted)',
                                                border: `1px solid ${doc.isPublished ? 'hsla(var(--accent-primary)/0.2)' : 'var(--border-glass)'}`
                                            }}>
                                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: doc.isPublished ? 'hsl(var(--accent-primary))' : 'var(--text-muted)' }}></span>
                                                {doc.isPublished ? 'PUBLISHED' : 'DRAFT'}
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button
                                                    onClick={() => setEditingDoc(doc)}
                                                    className="btn-secondary"
                                                    style={{ padding: '0.4rem 0.5rem', borderRadius: '6px' }}
                                                    title="Edit"
                                                >
                                                    <Edit size={14} />
                                                </button>
                                                <button
                                                    onClick={() => togglePublish(doc.id, doc.isPublished)}
                                                    className={doc.isPublished ? "btn-secondary" : "btn-primary"}
                                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                                                >
                                                    {doc.isPublished ? 'Unpublish' : 'Publish'}
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(doc.id)}
                                                    style={{
                                                        background: 'rgba(255, 59, 48, 0.1)',
                                                        color: '#ff3b30',
                                                        border: 'none',
                                                        padding: '0.4rem 0.5rem',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer'
                                                    }}
                                                    title="Delete"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Edit Modal */}
            {editingDoc && (
                <div className="admin-modal-overlay">
                    <div className="admin-modal-content">
                        <div className="admin-modal-header">
                            <h3>Edit Document</h3>
                            <button onClick={() => setEditingDoc(null)} className="btn-secondary">×</button>
                        </div>
                        <form onSubmit={handleUpdate}>
                            <div className="admin-modal-body">
                                <div className="admin-form-group">
                                    <label className="admin-label">Display Name</label>
                                    <input
                                        className="admin-input"
                                        value={editingDoc.name}
                                        onChange={(e) => setEditingDoc({ ...editingDoc, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="admin-form-group">
                                    <label className="admin-label">Resource Type</label>
                                    <select
                                        className="admin-select"
                                        value={editingDoc.type}
                                        onChange={(e) => setEditingDoc({ ...editingDoc, type: e.target.value })}
                                    >
                                        <option value="Report">Report</option>
                                        <option value="Implementation Guide">Implementation Guide</option>
                                        <option value="Case Study">Case Study</option>
                                        <option value="Cheat Sheet">Cheat Sheet</option>
                                    </select>
                                </div>
                                <div className="admin-form-group">
                                    <label className="admin-label">Description</label>
                                    <textarea
                                        className="admin-textarea"
                                        style={{ minHeight: '120px' }}
                                        value={editingDoc.description || ''}
                                        onChange={(e) => setEditingDoc({ ...editingDoc, description: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="admin-modal-footer">
                                <button type="button" onClick={() => setEditingDoc(null)} className="admin-btn-secondary">Cancel</button>
                                <button type="submit" className="admin-btn-primary">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

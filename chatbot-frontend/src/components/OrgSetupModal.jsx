import React from 'react';
import { useChat } from '../context/ChatContext';
import '../styles/components.css';

function OrgSetupModal() {
    const { showOrgSetup, organizations, orgId, closeOrgSetup, selectOrganization } = useChat();

    if (!showOrgSetup) return null;

    return (
        <div className="org-setup-overlay" onClick={closeOrgSetup}>
            <div className="org-setup-modal" onClick={(e) => e.stopPropagation()}>
                <div className="org-setup-header">
                    <h2>Select Organization</h2>
                    <button className="org-setup-close" onClick={closeOrgSetup} aria-label="Close">
                        ×
                    </button>
                </div>
                
                <div className="org-setup-content">
                    <p className="org-setup-description">
                        Choose which organization's knowledge base to use for responses.
                    </p>
                    
                    <div className="org-setup-current">
                        <span className="org-setup-label">Current:</span>
                        <span className="org-setup-current-value">{orgId.toUpperCase()}</span>
                    </div>
                    
                    <div className="org-setup-list">
                        {organizations.length === 0 ? (
                            <div className="org-setup-empty">
                                No organizations available
                            </div>
                        ) : (
                            organizations.map((org) => (
                                <button
                                    key={org.org_id}
                                    className={`org-setup-item ${orgId === org.org_id ? 'selected' : ''}`}
                                    onClick={() => selectOrganization(org.org_id)}
                                >
                                    <div className="org-setup-item-name">{org.name}</div>
                                    <div className="org-setup-item-id">{org.org_id}</div>
                                    {orgId === org.org_id && (
                                        <div className="org-setup-checkmark">✓</div>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default OrgSetupModal;

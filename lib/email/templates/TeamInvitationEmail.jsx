/**
 * Team Invitation Email Template
 * Sent when a user is invited to join a business
 */
export function TeamInvitationEmail({ inviteUrl, businessName, role, inviterName, customMessage }) {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 600, margin: '0 auto', padding: 24 }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
          You're Invited to Join Tenvo
        </h1>
        <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
          {inviterName || 'A team member'} has invited you to collaborate
        </p>
      </div>

      {/* Business Card */}
      <div
        style={{
          background: 'linear-gradient(135deg, #881337 0%, #9f1239 100%)',
          borderRadius: 16,
          padding: 24,
          marginBottom: 24,
          color: '#fff',
        }}
      >
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 8px', opacity: 0.9 }}>
          Business
        </p>
        <h2 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 12px' }}>{businessName}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0, opacity: 0.9 }}>
            Your Role:
          </p>
          <p style={{ fontSize: 16, fontWeight: 700, margin: 0, textTransform: 'capitalize' }}>{role}</p>
        </div>
      </div>

      {/* Custom Message */}
      {customMessage && (
        <div
          style={{
            background: '#f1f5f9',
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
            borderLeft: '4px solid #881337',
          }}
        >
          <p style={{ fontSize: 12, fontWeight: 700, color: '#475569', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Message from {inviterName}:
          </p>
          <p style={{ fontSize: 14, color: '#1e293b', margin: 0, lineHeight: 1.6 }}>{customMessage}</p>
        </div>
      )}

      {/* Call to Action */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <a
          href={inviteUrl}
          style={{
            display: 'inline-block',
            background: '#881337',
            color: '#ffffff',
            padding: '14px 32px',
            borderRadius: 12,
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: 16,
            boxShadow: '0 4px 12px rgba(136, 19, 55, 0.25)',
          }}
        >
          Accept Invitation
        </a>
        <p style={{ fontSize: 12, color: '#94a3b8', margin: '12px 0 0' }}>
          This invitation link is valid for 7 days
        </p>
      </div>

      {/* What's Next */}
      <div style={{ background: '#f8fafc', borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 12px' }}>What happens next?</h3>
        <ol style={{ margin: 0, paddingLeft: 20, color: '#475569', fontSize: 14, lineHeight: 1.8 }}>
          <li>Click the "Accept Invitation" button above</li>
          <li>Create your account or sign in if you already have one</li>
          <li>Start collaborating with your team immediately</li>
        </ol>
      </div>

      {/* Alternative Link */}
      <div style={{ background: '#fff7ed', borderRadius: 12, padding: 16, marginBottom: 24, border: '1px solid #fed7aa' }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: '#9a3412', margin: '0 0 8px' }}>
          Button not working?
        </p>
        <p style={{ fontSize: 12, color: '#9a3412', margin: 0, wordBreak: 'break-all' }}>
          Copy and paste this link into your browser:<br />
          <a href={inviteUrl} style={{ color: '#881337', textDecoration: 'underline' }}>{inviteUrl}</a>
        </p>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', borderTop: '1px solid #e2e8f0', paddingTop: 24 }}>
        <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 8px' }}>
          If you did not expect this invitation, you can safely ignore this email.
        </p>
        <p style={{ fontSize: 12, color: '#cbd5e1', margin: 0 }}>
          © {new Date().getFullYear()} Tenvo ERP · Cloud Business Management Platform
        </p>
      </div>
    </div>
  );
}

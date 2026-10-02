export default function MessagesIndexPage() {
  // Desktop right pane when no thread is selected (hidden on mobile, where the list fills the screen).
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center gap-space-sm p-space-xl bg-background/60">
      <span className="w-16 h-16 rounded-2xl bg-surface-container-low text-primary flex items-center justify-center">
        <span className="material-symbols-outlined text-3xl">chat</span>
      </span>
      <h2 className="font-title-md text-title-md text-on-surface">Pick a conversation</h2>
      <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm">
        Choose a chat on the left to read and reply. Keep payments and bookings on WagStays so you stay covered by WagShield.
      </p>
    </div>
  );
}

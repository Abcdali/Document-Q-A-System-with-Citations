"use client";

import Logo from "@/components/Logo";
import FileUpload from "@/components/FileUpload";
import ChatWindow from "@/components/ChatWindow";

export default function Home() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <Logo />

      <div className="mt-8 mb-2">
        <FileUpload onUploaded={() => {}} />
      </div>

      <div className="mb-4 text-right">
        <a href="/documents" className="text-xs text-[var(--accent-blue)] hover:underline font-[family-name:var(--font-mono)]">
          manage documents -{'>'}
        </a>
      </div>

      <ChatWindow />
    </main>
  );
}
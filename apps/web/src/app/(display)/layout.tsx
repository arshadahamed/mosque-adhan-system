export default function DisplayLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0a0a0f] text-white overflow-hidden antialiased">
        {children}
      </body>
    </html>
  );
}

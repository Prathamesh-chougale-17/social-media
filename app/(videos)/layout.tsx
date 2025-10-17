/**
 * Videos Section Layout
 * 
 * Layout wrapper for the videos section.
 * Provides consistent structure and styling for video pages.
 */

export default function VideosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-7xl">
        {children}
      </div>
    </div>
  );
}

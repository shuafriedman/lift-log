export default function Loading({ text }: { text: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="text-center">
        <div className="relative w-20 h-20 mx-auto mb-4">
          <div className="absolute inset-0 border-4 border-neutral-800 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-t-neutral-400 border-r-neutral-600 border-b-transparent border-l-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-neutral-400 font-medium">{`Loading ${text}...`}</p>
      </div>
    </div>
  );
}

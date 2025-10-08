interface FullPageLoaderProps {
  message?: string;
}

export const FullPageLoader = ({ message = 'Loading...' }: FullPageLoaderProps) => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="text-center">
      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      <p className="mt-4 text-muted-foreground">{message}</p>
    </div>
  </div>
);

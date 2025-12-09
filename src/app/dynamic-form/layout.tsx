import { AppNavBar } from '@/components/navigation';

export default function DynamicFormLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#e0e5ec]">
      <AppNavBar />
      {children}
    </div>
  );
}

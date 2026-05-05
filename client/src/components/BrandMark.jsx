import { BookOpen } from 'lucide-react';

export function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-white">
        <BookOpen size={24} />
      </div>
      <div>
        <p className="text-lg font-black leading-5 text-ink">Structure</p>
        <p className="text-lg font-black leading-5 text-primary">MyLearning</p>
      </div>
    </div>
  );
}

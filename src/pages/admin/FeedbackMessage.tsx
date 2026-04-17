interface FeedbackMessageProps {
  message: { type: string; text: string };
  isDark: boolean;
}

export const FeedbackMessage = ({ message, isDark }: FeedbackMessageProps) => {
  if (!message.text) return null;

  const isSuccess = message.type === 'success';

  return (
    <div className={`mb-6 p-4 rounded-xl text-sm font-medium border ${
      isSuccess 
        ? (isDark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-600')
        : (isDark ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-600')
    }`}>
      {message.text}
    </div>
  );
};
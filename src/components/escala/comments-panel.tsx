"use client";
import { useEffect, useRef } from "react";
import { MessageCircle, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { STEPS } from "@/components/pipeline/mini-pipeline";

interface Comment {
  _id: string;
  userId: { _id: string; name?: string };
  message: string;
  stage: string;
  createdAt: string;
}

interface Props {
  comments: Comment[];
  currentUserId: string;
  newComment: string;
  onChangeNewComment: (v: string) => void;
  onSend: () => void;
  sending: boolean;
}

export function CommentsPanel({
  comments,
  currentUserId,
  newComment,
  onChangeNewComment,
  onSend,
  sending,
}: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = endRef.current;
    if (!el) return;
    const container = el.parentElement;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [comments]);

  return (
    <div className="card-glass rounded-xl overflow-hidden lg:sticky lg:top-6">
      <div
        className="flex flex-col"
        style={{ height: "min(calc(100vh - 6rem), 640px)" }}
      >
        {/* Header */}
        <div className="px-3 py-2.5 border-b border-border/40 bg-[oklch(0.22_0.016_172)] flex items-center gap-2 shrink-0">
          <MessageCircle className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-bold">Conversa</span>
          {comments.length > 0 && (
            <span className="text-[9px] font-bold bg-primary/15 text-primary rounded-full h-4 min-w-4 flex items-center justify-center px-1 ml-auto font-mono tabular-nums">
              {comments.length}
            </span>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
          {comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <MessageCircle className="h-6 w-6 text-muted-foreground/15 mb-1.5" />
              <p className="text-[11px] text-muted-foreground/40">
                Nenhum comentário ainda
              </p>
              <p className="text-[10px] text-muted-foreground/30 mt-0.5">
                Seja o primeiro a comentar
              </p>
            </div>
          ) : (
            comments.map((c) => {
              const isMe = c.userId?._id === currentUserId;
              const cStep = STEPS.find((s) => s.key === c.stage);
              return (
                <div
                  key={c._id}
                  className={cn("flex gap-2", isMe && "flex-row-reverse")}
                >
                  <div
                    className={cn(
                      "h-6 w-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5",
                      isMe
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {c.userId?.name?.[0] || "?"}
                  </div>
                  <div className={cn("max-w-[82%] min-w-0", isMe && "text-right")}>
                    <div
                      className={cn(
                        "flex items-center gap-1.5 mb-0.5",
                        isMe && "justify-end"
                      )}
                    >
                      <span className="text-[10px] font-bold truncate">
                        {c.userId?.name}
                      </span>
                      {cStep && (
                        <span
                          className={cn(
                            "text-[8px] font-bold px-1 py-px rounded-sm uppercase tracking-wider",
                            cStep.tagBg
                          )}
                        >
                          {cStep.label}
                        </span>
                      )}
                      <span className="text-[9px] text-muted-foreground/50 font-mono">
                        {formatDistanceToNow(new Date(c.createdAt), {
                          addSuffix: false,
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                    <div
                      className={cn(
                        "inline-block px-3 py-2 rounded-xl text-[13px] leading-relaxed text-left",
                        isMe
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "bg-[oklch(0.24_0.016_172)] rounded-tl-sm"
                      )}
                    >
                      {c.message}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div className="p-2 border-t border-border/40 bg-[oklch(0.22_0.016_172)] shrink-0">
          <div className="flex gap-1.5">
            <Textarea
              value={newComment}
              onChange={(e) => onChangeNewComment(e.target.value)}
              placeholder="Escreva uma mensagem…"
              className="min-h-9 max-h-24 text-xs resize-none bg-background/40 rounded-lg py-2"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
            />
            <Button
              size="icon"
              disabled={!newComment.trim() || sending}
              onClick={onSend}
              className="h-9 w-9 shrink-0 rounded-lg"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

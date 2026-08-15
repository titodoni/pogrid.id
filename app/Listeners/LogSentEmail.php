<?php

namespace App\Listeners;

use App\Models\EmailLog;
use App\Services\TenantManager;
use Illuminate\Mail\Events\MessageSending;
use Illuminate\Mail\Events\MessageSent;
use Symfony\Component\Mime\Address;

/**
 * Records outbound mail into `email_logs`.
 *
 * Methods are deliberately NOT named `handle*`: Laravel's automatic listener
 * discovery scans `app/Listeners` for `handle*`/`__invoke` methods with a typed
 * first parameter, which would register this class a second time on top of the
 * explicit `Event::listen` calls in AppServiceProvider and write duplicate rows
 * for every message.
 */
class LogSentEmail
{
    /**
     * Custom header used to correlate the MessageSending and MessageSent
     * events. The same Symfony message instance flows through both events,
     * so a header written on send is readable on sent — robust under
     * concurrency, unlike matching by recipient/subject.
     */
    protected const CORRELATION_HEADER = 'X-EmailLog-Id';

    public function recordSending(MessageSending $event): void
    {
        $message = $event->message;

        $to = $this->addresses($message->getTo());
        $from = $this->addresses($message->getFrom()) ?: '';

        $log = TenantManager::runWithoutScope(function () use ($message, $to, $from) {
            return EmailLog::create([
                'tenant_id' => TenantManager::getTenantId(),
                'from' => $this->firstAddress($from),
                'to' => $to,
                'subject' => $message->getSubject(),
                'body' => $message->getTextBody() ?? $message->getHtmlBody() ?? '',
                'status' => EmailLog::STATUS_QUEUED,
            ]);
        });

        // Stamp the log id onto the message so handleSent can find this row.
        $headers = $message->getHeaders();
        if ($headers->has(self::CORRELATION_HEADER)) {
            $headers->remove(self::CORRELATION_HEADER);
        }
        $headers->addTextHeader(self::CORRELATION_HEADER, (string) $log->id);
    }

    public function recordSent(MessageSent $event): void
    {
        $message = $event->message;
        $headers = $message->getHeaders();

        $logId = $headers->has(self::CORRELATION_HEADER)
            ? (int) $headers->get(self::CORRELATION_HEADER)->getBodyAsString()
            : null;

        // Transport-level id, exposed by Symfony's SentMessage. `Email` itself
        // has no generateId(); only generateMessageId(), which would mint a
        // *new* id rather than report the one that was actually sent.
        $messageId = $event->sent->getMessageId();

        TenantManager::runWithoutScope(function () use ($logId, $message, $messageId) {
            if ($logId) {
                $log = EmailLog::find($logId);
                if ($log) {
                    $log->update([
                        'status' => EmailLog::STATUS_SENT,
                        'message_id' => $messageId,
                        'sent_at' => now(),
                    ]);

                    return;
                }
            }

            // Fallback: MessageSending wasn't captured (e.g. transport sent
            // directly). Record the sent message on its own.
            EmailLog::create([
                'tenant_id' => TenantManager::getTenantId(),
                'message_id' => $messageId,
                'from' => $this->firstAddress($this->addresses($message->getFrom())),
                'to' => $this->addresses($message->getTo()),
                'subject' => $message->getSubject(),
                'body' => $message->getTextBody() ?? $message->getHtmlBody() ?? '',
                'status' => EmailLog::STATUS_SENT,
                'sent_at' => now(),
            ]);
        });
    }

    /**
     * Flatten Symfony Address objects into a comma-separated address string.
     *
     * @param  array<int, Address>  $addresses
     */
    protected function addresses(array $addresses): string
    {
        return collect($addresses)
            ->map(fn (Address $addr) => $addr->getAddress())
            ->implode(',');
    }

    protected function firstAddress(string $csv): string
    {
        return explode(',', $csv)[0] ?? '';
    }
}

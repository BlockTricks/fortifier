;; Guard Contract
;; Provides policy checks: per-period spend caps, recipient allow/deny lists
;; Uses Clarity 4 features

(define-constant ERR-UNAUTHORIZED (err u2001))
(define-constant ERR-SPEND-CAP-EXCEEDED (err u2002))
(define-constant ERR-RECIPIENT-DENIED (err u2003))
(define-constant ERR-RECIPIENT-NOT-ALLOWED (err u2004))
(define-constant ERR-INVALID-POLICY (err u2005))

;; Policy configuration
(define-data-var owner principal (as-contract tx-sender))
(define-data-var spend-cap-enabled bool false)
(define-data-var spend-cap-amount uint u0)
(define-data-var spend-cap-period uint u0)
(define-data-var spend-cap-window-start uint none)
(define-data-var spend-cap-window-spent uint u0)

;; Recipient lists
(define-data-var allow-list-enabled bool false)
(define-data-var allow-list (list 100 principal) (list))
(define-data-var deny-list (list 100 principal) (list))

;; Events
(define-event spend-cap-set (amount uint) (period uint))
(define-event recipient-allowed (recipient principal))
(define-event recipient-denied (recipient principal))
(define-event recipient-removed-from-allow-list (recipient principal))
(define-event recipient-removed-from-deny-list (recipient principal))

;; Helper: Check if caller is authorized
(define-private (is-authorized (caller principal))
	(begin
		(asserts! (is-eq caller (var-get owner)) ERR-UNAUTHORIZED)
		true
	)
)

;; Helper: Reset spend cap window if period expired
(define-private (reset-spend-cap-window-if-needed)
	(if (var-get spend-cap-enabled)
		(let ((current-block block-height)
			  (window-start (unwrap-panic (var-get spend-cap-window-start)))
			  (period (var-get spend-cap-period)))
			(if (>= (- current-block window-start) period)
				(begin
					(var-set spend-cap-window-start (some current-block))
					(var-set spend-cap-window-spent u0)
				)
				true
			)
		)
		true
	)
)

;; Public: Set spend cap policy
(define-public (set-spend-cap (amount uint) (period uint))
	(let ((caller tx-sender))
		(begin
			(asserts! (is-authorized caller) ERR-UNAUTHORIZED)
			(asserts! (> amount u0) ERR-INVALID-POLICY)
			(asserts! (> period u0) ERR-INVALID-POLICY)
			(var-set spend-cap-enabled true)
			(var-set spend-cap-amount amount)
			(var-set spend-cap-period period)
			(var-set spend-cap-window-start (some block-height))
			(var-set spend-cap-window-spent u0)
			(ok (event-emit spend-cap-set amount period))
		)
	)
)

;; Public: Disable spend cap
(define-public (disable-spend-cap)
	(let ((caller tx-sender))
		(begin
			(asserts! (is-authorized caller) ERR-UNAUTHORIZED)
			(var-set spend-cap-enabled false)
			(ok true)
		)
	)
)

;; Public: Check if amount is within spend cap
(define-read-only (check-spend-cap (amount uint))
	(if (var-get spend-cap-enabled)
		(begin
			(let ((current-block block-height)
				  (window-start (unwrap-panic (var-get spend-cap-window-start)))
				  (period (var-get spend-cap-period))
				  (spent (var-get spend-cap-window-spent))
				  (cap (var-get spend-cap-amount)))
				(if (>= (- current-block window-start) period)
					true
					(<= (+ spent amount) cap)
				)
			)
		)
		true
	)
)

;; Public: Record spending (updates window if needed)
(define-public (record-spend (amount uint))
	(let ((caller tx-sender))
		(begin
			(asserts! (is-authorized caller) ERR-UNAUTHORIZED)
			(reset-spend-cap-window-if-needed)
			(asserts! (check-spend-cap amount) ERR-SPEND-CAP-EXCEEDED)
			(var-set spend-cap-window-spent (+ (var-get spend-cap-window-spent) amount))
			(ok true)
		)
	)
)

;; Public: Get spend cap info
(define-read-only (get-spend-cap-info)
	{
		enabled: (var-get spend-cap-enabled),
		amount: (var-get spend-cap-amount),
		period: (var-get spend-cap-period),
		window-start: (var-get spend-cap-window-start),
		spent: (var-get spend-cap-window-spent)
	}
)

;; Public: Enable allow list mode
(define-public (enable-allow-list)
	(let ((caller tx-sender))
		(begin
			(asserts! (is-authorized caller) ERR-UNAUTHORIZED)
			(var-set allow-list-enabled true)
			(ok true)
		)
	)
)

;; Public: Disable allow list mode
(define-public (disable-allow-list)
	(let ((caller tx-sender))
		(begin
			(asserts! (is-authorized caller) ERR-UNAUTHORIZED)
			(var-set allow-list-enabled false)
			(ok true)
		)
	)
)

;; Public: Add recipient to allow list
(define-public (allow-recipient (recipient principal))
	(let ((caller tx-sender))
		(begin
			(asserts! (is-authorized caller) ERR-UNAUTHORIZED)
			(asserts! (not (contains? (var-get allow-list) recipient)) ERR-UNAUTHORIZED)
			(var-set allow-list (append (var-get allow-list) (list recipient)))
			(ok (event-emit recipient-allowed recipient))
		)
	)
)

;; Public: Remove recipient from allow list
(define-public (remove-from-allow-list (recipient principal))
	(let ((caller tx-sender))
		(begin
			(asserts! (is-authorized caller) ERR-UNAUTHORIZED)
			(var-set allow-list (filter (var-get allow-list) (lambda (r principal) (not (is-eq r recipient)))))
			(ok (event-emit recipient-removed-from-allow-list recipient))
		)
	)
)

;; Public: Add recipient to deny list
(define-public (deny-recipient (recipient principal))
	(let ((caller tx-sender))
		(begin
			(asserts! (is-authorized caller) ERR-UNAUTHORIZED)
			(asserts! (not (contains? (var-get deny-list) recipient)) ERR-UNAUTHORIZED)
			(var-set deny-list (append (var-get deny-list) (list recipient)))
			(ok (event-emit recipient-denied recipient))
		)
	)
)

;; Public: Remove recipient from deny list
(define-public (remove-from-deny-list (recipient principal))
	(let ((caller tx-sender))
		(begin
			(asserts! (is-authorized caller) ERR-UNAUTHORIZED)
			(var-set deny-list (filter (var-get deny-list) (lambda (r principal) (not (is-eq r recipient)))))
			(ok (event-emit recipient-removed-from-deny-list recipient))
		)
	)
)

;; Public: Check if recipient is allowed
(define-read-only (is-recipient-allowed (recipient principal))
	(begin
		;; Deny list takes precedence
		(asserts! (not (contains? (var-get deny-list) recipient)) ERR-RECIPIENT-DENIED)
		;; If allow list is enabled, check if recipient is in it
		(if (var-get allow-list-enabled)
			(asserts! (contains? (var-get allow-list) recipient) ERR-RECIPIENT-NOT-ALLOWED)
			true
		)
	)
)

;; Public: Get allow list
(define-read-only (get-allow-list)
	(var-get allow-list)
)

;; Public: Get deny list
(define-read-only (get-deny-list)
	(var-get deny-list)
)

;; Public: Validate transfer (comprehensive check)
(define-read-only (validate-transfer (recipient principal) (amount uint))
	(begin
		(asserts! (is-recipient-allowed recipient) ERR-RECIPIENT-DENIED)
		(asserts! (check-spend-cap amount) ERR-SPEND-CAP-EXCEEDED)
		true
	)
)

;; Public: Transfer ownership
(define-public (transfer-ownership (new-owner principal))
	(let ((caller tx-sender))
		(begin
			(asserts! (is-authorized caller) ERR-UNAUTHORIZED)
			(var-set owner new-owner)
			(ok true)
		)
	)
)

;; Public: Get owner
(define-read-only (get-owner)
	(var-get owner)
)


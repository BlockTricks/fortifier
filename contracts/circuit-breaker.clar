;; Circuit Breaker Contract
;; Provides pause/unpause functionality with staged unpause and rate limits
;; Uses Clarity 4 features

(define-constant ERR-UNAUTHORIZED (err u1001))
(define-constant ERR-PAUSED (err u1002))
(define-constant ERR-NOT-PAUSED (err u1003))
(define-constant ERR-INVALID-RATE-LIMIT (err u1004))
(define-constant ERR-RATE-LIMIT-EXCEEDED (err u1005))
(define-constant ERR-STAGED-UNPAUSE-ACTIVE (err u1006))
(define-constant ERR-INVALID-OWNER (err u1007))

(define-data-var paused bool false)
(define-data-var paused-by principal none)
(define-data-var pause-block-height uint none)

;; Staged unpause configuration
(define-data-var staged-unpause-active bool false)
(define-data-var staged-unpause-start-block uint none)
(define-data-var staged-unpause-duration uint none)
(define-data-var staged-unpause-rate-limit uint none)
(define-data-var staged-unpause-total-spent uint u0)

;; Global rate limit (per block)
(define-data-var global-rate-limit uint none)
(define-data-var rate-limit-window-start uint none)
(define-data-var rate-limit-window-spent uint u0)

;; Owner/guardian management
(define-data-var owner principal (as-contract tx-sender))
(define-data-var guardians (list 10 principal) (list))

;; Events
(define-event pause-event (paused-by principal) (block-height uint))
(define-event unpause-event (unpaused-by principal) (block-height uint))
(define-event staged-unpause-started (start-block uint) (duration uint) (rate-limit uint))
(define-event rate-limit-set (rate-limit uint))

;; Helper: Check if caller is authorized
(define-private (is-authorized (caller principal))
	(begin
		(asserts! (is-eq caller (var-get owner)) ERR-UNAUTHORIZED)
		true
	)
)

;; Helper: Check if caller is guardian
(define-private (is-guardian (caller principal))
	(contains? (var-get guardians) caller)
)

;; Helper: Check if caller is authorized or guardian
(define-private (is-authorized-or-guardian (caller principal))
	(or (is-eq caller (var-get owner)) (is-guardian caller))
)

;; Public: Pause the contract
(define-public (pause)
	(let ((caller tx-sender))
		(begin
			(asserts! (is-authorized-or-guardian caller) ERR-UNAUTHORIZED)
			(asserts! (not (var-get paused)) ERR-PAUSED)
			(var-set paused true)
			(var-set paused-by caller)
			(var-set pause-block-height block-height)
			(ok (event-emit pause-event caller block-height))
		)
	)
)

;; Public: Unpause the contract (immediate)
(define-public (unpause)
	(let ((caller tx-sender))
		(begin
			(asserts! (is-authorized caller) ERR-UNAUTHORIZED)
			(asserts! (var-get paused) ERR-NOT-PAUSED)
			(asserts! (not (var-get staged-unpause-active)) ERR-STAGED-UNPAUSE-ACTIVE)
			(var-set paused false)
			(var-set paused-by none)
			(var-set pause-block-height none)
			(var-set staged-unpause-active false)
			(ok (event-emit unpause-event caller block-height))
		)
	)
)

;; Public: Start staged unpause with rate limit
(define-public (staged-unpause (duration uint) (rate-limit uint))
	(let ((caller tx-sender))
		(begin
			(asserts! (is-authorized caller) ERR-UNAUTHORIZED)
			(asserts! (var-get paused) ERR-NOT-PAUSED)
			(asserts! (> duration u0) ERR-INVALID-RATE-LIMIT)
			(asserts! (> rate-limit u0) ERR-INVALID-RATE-LIMIT)
			(var-set staged-unpause-active true)
			(var-set staged-unpause-start-block block-height)
			(var-set staged-unpause-duration duration)
			(var-set staged-unpause-rate-limit rate-limit)
			(var-set staged-unpause-total-spent u0)
			(ok (event-emit staged-unpause-started block-height duration rate-limit))
		)
	)
)

;; Public: Check if contract is paused
(define-read-only (is-paused)
	(var-get paused)
)

;; Public: Get pause information
(define-read-only (get-pause-info)
	{
		paused: (var-get paused),
		paused-by: (var-get paused-by),
		pause-block-height: (var-get pause-block-height),
		staged-unpause-active: (var-get staged-unpause-active),
		staged-unpause-start-block: (var-get staged-unpause-start-block),
		staged-unpause-duration: (var-get staged-unpause-duration),
		staged-unpause-rate-limit: (var-get staged-unpause-rate-limit),
		staged-unpause-total-spent: (var-get staged-unpause-total-spent)
	}
)

;; Public: Check if amount is allowed during staged unpause
(define-read-only (check-staged-unpause-limit (amount uint))
	(if (var-get staged-unpause-active)
		(let ((current-block block-height)
			  (start-block (unwrap-panic (var-get staged-unpause-start-block)))
			  (duration (unwrap-panic (var-get staged-unpause-duration)))
			  (rate-limit (unwrap-panic (var-get staged-unpause-rate-limit)))
			  (total-spent (var-get staged-unpause-total-spent)))
			(if (>= (- current-block start-block) duration)
				false
				(<= (+ total-spent amount) rate-limit)
			)
		)
		true
	)
)

;; Public: Record spending during staged unpause
(define-public (record-staged-spend (amount uint))
	(let ((caller tx-sender))
		(begin
			(asserts! (is-authorized-or-guardian caller) ERR-UNAUTHORIZED)
			(asserts! (var-get staged-unpause-active) ERR-STAGED-UNPAUSE-ACTIVE)
			(asserts! (check-staged-unpause-limit amount) ERR-RATE-LIMIT-EXCEEDED)
			(var-set staged-unpause-total-spent (+ (var-get staged-unpause-total-spent) amount))
			(ok true)
		)
	)
)

;; Public: Set global rate limit
(define-public (set-rate-limit (rate-limit uint))
	(let ((caller tx-sender))
		(begin
			(asserts! (is-authorized caller) ERR-UNAUTHORIZED)
			(var-set global-rate-limit (some rate-limit))
			(var-set rate-limit-window-start block-height)
			(var-set rate-limit-window-spent u0)
			(ok (event-emit rate-limit-set rate-limit))
		)
	)
)

;; Public: Get current rate limit
(define-read-only (get-rate-limit)
	(var-get global-rate-limit)
)

;; Public: Add guardian
(define-public (add-guardian (guardian principal))
	(let ((caller tx-sender))
		(begin
			(asserts! (is-authorized caller) ERR-UNAUTHORIZED)
			(asserts! (not (contains? (var-get guardians) guardian)) ERR-UNAUTHORIZED)
			(var-set guardians (append (var-get guardians) (list guardian)))
			(ok true)
		)
	)
)

;; Public: Remove guardian
(define-public (remove-guardian (guardian principal))
	(let ((caller tx-sender))
		(begin
			(asserts! (is-authorized caller) ERR-UNAUTHORIZED)
			(var-set guardians (filter (var-get guardians) (lambda (g principal) (not (is-eq g guardian)))))
			(ok true)
		)
	)
)

;; Public: Get guardians
(define-read-only (get-guardians)
	(var-get guardians)
)

;; Public: Transfer ownership (should use role-change-guardian for production)
(define-public (transfer-ownership (new-owner principal))
	(let ((caller tx-sender))
		(begin
			(asserts! (is-authorized caller) ERR-UNAUTHORIZED)
			(asserts! (is-eq (var-get paused) false) ERR-PAUSED)
			(asserts! (not (is-eq new-owner caller)) ERR-INVALID-OWNER)
			(var-set owner new-owner)
			(ok true)
		)
	)
)

;; Public: Emergency reset staged unpause (owner only)
(define-public (reset-staged-unpause)
	(let ((caller tx-sender))
		(begin
			(asserts! (is-authorized caller) ERR-UNAUTHORIZED)
			(var-set staged-unpause-active false)
			(var-set staged-unpause-start-block none)
			(var-set staged-unpause-duration none)
			(var-set staged-unpause-rate-limit none)
			(var-set staged-unpause-total-spent u0)
			(ok true)
		)
	)
)

;; Public: Get owner
(define-read-only (get-owner)
	(var-get owner)
)


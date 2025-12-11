;; Quarantine Registry Contract
;; Marks risky recipients/contracts for isolation
;; Uses Clarity 4 features

(define-constant ERR-UNAUTHORIZED (err u3001))
(define-constant ERR-ALREADY-QUARANTINED (err u3002))
(define-constant ERR-NOT-QUARANTINED (err u3003))
(define-constant ERR-INVALID-REASON (err u3004))

;; Quarantine data structure
(define-map quarantine-registry principal {
	quarantined: bool,
	quarantined-by: principal,
	quarantined-at: uint,
	reason: (string-ascii 200),
	severity: uint
})

;; Owner and guardians
(define-data-var owner principal (as-contract tx-sender))
(define-data-var guardians (list 10 principal) (list))

;; Events
(define-event recipient-quarantined (recipient principal) (quarantined-by principal) (reason (string-ascii 200)) (severity uint))
(define-event recipient-cleared (recipient principal) (cleared-by principal))

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

;; Public: Quarantine a recipient
(define-public (quarantine-recipient (recipient principal) (reason (string-ascii 200)) (severity uint))
	(let ((caller tx-sender))
		(begin
			(asserts! (is-authorized-or-guardian caller) ERR-UNAUTHORIZED)
			(asserts! (> (len reason) u0) ERR-INVALID-REASON)
			(asserts! (<= severity u10) ERR-INVALID-REASON)
			(match (map-get? quarantine-registry recipient)
				entry (begin
					(asserts! (not (get quarantined entry)) ERR-ALREADY-QUARANTINED)
					(map-set quarantine-registry recipient {
						quarantined: true,
						quarantined-by: caller,
						quarantined-at: block-height,
						reason: reason,
						severity: severity
					})
				)
				none (begin
					(map-set quarantine-registry recipient {
						quarantined: true,
						quarantined-by: caller,
						quarantined-at: block-height,
						reason: reason,
						severity: severity
					})
				)
			)
			(ok (event-emit recipient-quarantined recipient caller reason severity))
		)
	)
)

;; Public: Clear quarantine for a recipient
(define-public (clear-quarantine (recipient principal))
	(let ((caller tx-sender))
		(begin
			(asserts! (is-authorized caller) ERR-UNAUTHORIZED)
			(match (map-get? quarantine-registry recipient)
				entry (begin
					(asserts! (get quarantined entry) ERR-NOT-QUARANTINED)
					(map-set quarantine-registry recipient {
						quarantined: false,
						quarantined-by: (get quarantined-by entry),
						quarantined-at: (get quarantined-at entry),
						reason: (get reason entry),
						severity: (get severity entry)
					})
					(ok (event-emit recipient-cleared recipient caller))
				)
				none (err ERR-NOT-QUARANTINED)
			)
		)
	)
)

;; Public: Check if recipient is quarantined
(define-read-only (is-quarantined (recipient principal))
	(match (map-get? quarantine-registry recipient)
		entry (get quarantined entry)
		none false
	)
)

;; Public: Get quarantine info for a recipient
(define-read-only (get-quarantine-info (recipient principal))
	(map-get? quarantine-registry recipient)
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


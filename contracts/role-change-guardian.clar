;; Role Change Guardian Contract
;; Gates updates to signer/policy configs behind delays + multisig approval
;; Uses Clarity 4 features

(define-constant ERR-UNAUTHORIZED (err u4001))
(define-constant ERR-PROPOSAL-NOT-FOUND (err u4002))
(define-constant ERR-PROPOSAL-EXPIRED (err u4003))
(define-constant ERR-PROPOSAL-NOT-READY (err u4004))
(define-constant ERR-ALREADY-APPROVED (err u4005))
(define-constant ERR-INSUFFICIENT-APPROVALS (err u4006))
(define-constant ERR-INVALID-DELAY (err u4007))

;; Proposal data structure
(define-map proposals uint {
	proposal-type: (string-ascii 50),
	target: principal,
	new-value: principal,
	proposed-by: principal,
	proposed-at: uint,
	delay-until: uint,
	approvals: (list 20 principal),
	executed: bool
})

;; Configuration
(define-data-var owner principal (as-contract tx-sender))
(define-data-var proposal-counter uint u0)
(define-data-var min-delay uint u144) ;; Default: 144 blocks (~24 hours)
(define-data-var required-approvals uint u2) ;; Default: 2 approvals
(define-data-var approvers (list 20 principal) (list))

;; Events
(define-event proposal-created (proposal-id uint) (proposal-type (string-ascii 50)) (target principal) (proposed-by principal) (delay-until uint))
(define-event proposal-approved (proposal-id uint) (approver principal))
(define-event proposal-executed (proposal-id uint) (executed-by principal))

;; Helper: Check if caller is authorized
(define-private (is-authorized (caller principal))
	(begin
		(asserts! (is-eq caller (var-get owner)) ERR-UNAUTHORIZED)
		true
	)
)

;; Helper: Check if caller is approver
(define-private (is-approver (caller principal))
	(contains? (var-get approvers) caller)
)

;; Public: Propose signer change
(define-public (propose-signer-change (target principal) (new-signer principal))
	(let ((caller tx-sender)
		  (proposal-id (var-get proposal-counter))
		  (delay-until (+ block-height (var-get min-delay))))
		(begin
			(asserts! (is-authorized caller) ERR-UNAUTHORIZED)
			(map-set proposals proposal-id {
				proposal-type: "signer-change",
				target: target,
				new-value: new-signer,
				proposed-by: caller,
				proposed-at: block-height,
				delay-until: delay-until,
				approvals: (list),
				executed: false
			})
			(var-set proposal-counter (+ proposal-id u1))
			(ok (event-emit proposal-created proposal-id "signer-change" target caller delay-until))
		)
	)
)

;; Public: Propose policy change
(define-public (propose-policy-change (target principal) (new-policy principal))
	(let ((caller tx-sender)
		  (proposal-id (var-get proposal-counter))
		  (delay-until (+ block-height (var-get min-delay))))
		(begin
			(asserts! (is-authorized caller) ERR-UNAUTHORIZED)
			(map-set proposals proposal-id {
				proposal-type: "policy-change",
				target: target,
				new-value: new-policy,
				proposed-by: caller,
				proposed-at: block-height,
				delay-until: delay-until,
				approvals: (list),
				executed: false
			})
			(var-set proposal-counter (+ proposal-id u1))
			(ok (event-emit proposal-created proposal-id "policy-change" target caller delay-until))
		)
	)
)

;; Public: Approve proposal
(define-public (approve-proposal (proposal-id uint))
	(let ((caller tx-sender))
		(begin
			(asserts! (is-approver caller) ERR-UNAUTHORIZED)
			(match (map-get? proposals proposal-id)
				proposal (begin
					(asserts! (not (get executed proposal)) ERR-PROPOSAL-NOT-FOUND)
					(asserts! (not (contains? (get approvals proposal) caller)) ERR-ALREADY-APPROVED)
					(map-set proposals proposal-id {
						proposal-type: (get proposal-type proposal),
						target: (get target proposal),
						new-value: (get new-value proposal),
						proposed-by: (get proposed-by proposal),
						proposed-at: (get proposed-at proposal),
						delay-until: (get delay-until proposal),
						approvals: (append (get approvals proposal) (list caller)),
						executed: (get executed proposal)
					})
					(ok (event-emit proposal-approved proposal-id caller))
				)
				none (err ERR-PROPOSAL-NOT-FOUND)
			)
		)
	)
)

;; Public: Execute proposal
(define-public (execute-signer-change (proposal-id uint))
	(let ((caller tx-sender))
		(begin
			(asserts! (is-authorized caller) ERR-UNAUTHORIZED)
			(match (map-get? proposals proposal-id)
				proposal (begin
					(asserts! (not (get executed proposal)) ERR-PROPOSAL-NOT-FOUND)
					(asserts! (>= block-height (get delay-until proposal)) ERR-PROPOSAL-NOT-READY)
					(asserts! (>= (len (get approvals proposal)) (var-get required-approvals)) ERR-INSUFFICIENT-APPROVALS)
					(asserts! (is-eq (get proposal-type proposal) "signer-change") ERR-PROPOSAL-NOT-FOUND)
					(map-set proposals proposal-id {
						proposal-type: (get proposal-type proposal),
						target: (get target proposal),
						new-value: (get new-value proposal),
						proposed-by: (get proposed-by proposal),
						proposed-at: (get proposed-at proposal),
						delay-until: (get delay-until proposal),
						approvals: (get approvals proposal),
						executed: true
					})
					(ok (event-emit proposal-executed proposal-id caller))
				)
				none (err ERR-PROPOSAL-NOT-FOUND)
			)
		)
	)
)

;; Public: Get proposal info
(define-read-only (get-proposal (proposal-id uint))
	(map-get? proposals proposal-id)
)

;; Public: Get pending signer change
(define-read-only (pending-signer-change (target principal))
	(let ((counter (var-get proposal-counter)))
		(if (is-eq counter u0)
			none
			(let ((result (find (list u0 u1 u2 u3 u4 u5 u6 u7 u8 u9 u10 u11 u12 u13 u14 u15 u16 u17 u18 u19 u20)
				(lambda (id uint)
					(if (< id counter)
						(match (map-get? proposals id)
							proposal (and
								(is-eq (get target proposal) target)
								(is-eq (get proposal-type proposal) "signer-change")
								(not (get executed proposal))
							)
							none false
						)
						false
					)
				)
			)))
				(match result
					id (map-get? proposals id)
					none none
				)
			)
		)
	)
)

;; Public: Set minimum delay
(define-public (set-min-delay (delay uint))
	(let ((caller tx-sender))
		(begin
			(asserts! (is-authorized caller) ERR-UNAUTHORIZED)
			(asserts! (>= delay u1) ERR-INVALID-DELAY)
			(var-set min-delay delay)
			(ok true)
		)
	)
)

;; Public: Set required approvals
(define-public (set-required-approvals (count uint))
	(let ((caller tx-sender))
		(begin
			(asserts! (is-authorized caller) ERR-UNAUTHORIZED)
			(asserts! (>= count u1) ERR-INVALID-DELAY)
			(var-set required-approvals count)
			(ok true)
		)
	)
)

;; Public: Add approver
(define-public (add-approver (approver principal))
	(let ((caller tx-sender))
		(begin
			(asserts! (is-authorized caller) ERR-UNAUTHORIZED)
			(asserts! (not (contains? (var-get approvers) approver)) ERR-UNAUTHORIZED)
			(var-set approvers (append (var-get approvers) (list approver)))
			(ok true)
		)
	)
)

;; Public: Remove approver
(define-public (remove-approver (approver principal))
	(let ((caller tx-sender))
		(begin
			(asserts! (is-authorized caller) ERR-UNAUTHORIZED)
			(var-set approvers (filter (var-get approvers) (lambda (a principal) (not (is-eq a approver)))))
			(ok true)
		)
	)
)

;; Public: Get configuration
(define-read-only (get-config)
	{
		min-delay: (var-get min-delay),
		required-approvals: (var-get required-approvals),
		approvers: (var-get approvers),
		proposal-counter: (var-get proposal-counter)
	}
)


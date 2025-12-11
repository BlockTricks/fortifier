;; Fortifier Main Contract
;; Integrates circuit-breaker, guard, quarantine, and role-change-guardian
;; Uses Clarity 4 features

(define-constant ERR-UNAUTHORIZED (err u5001))
(define-constant ERR-PAUSED (err u5002))
(define-constant ERR-QUARANTINED (err u5003))
(define-constant ERR-GUARD-CHECK-FAILED (err u5004))
(define-constant ERR-CIRCUIT-BREAKER-CHECK-FAILED (err u5005))

;; Contract references (to be set during deployment)
(define-data-var circuit-breaker-contract principal none)
(define-data-var guard-contract principal none)
(define-data-var quarantine-contract principal none)
(define-data-var role-change-guardian-contract principal none)

;; Owner
(define-data-var owner principal (as-contract tx-sender))

;; Events
(define-event transfer-protected (recipient principal) (amount uint) (blocked bool) (reason (string-ascii 200)))
(define-event incident-detected (incident-type (string-ascii 50)) (details (string-ascii 200)))
(define-event contracts-configured (circuit-breaker principal) (guard principal) (quarantine principal) (role-guardian principal))

;; Helper: Check if caller is authorized
(define-private (is-authorized (caller principal))
	(begin
		(asserts! (is-eq caller (var-get owner)) ERR-UNAUTHORIZED)
		true
	)
)

;; Public: Configure contract references
(define-public (configure-contracts (circuit-breaker principal) (guard principal) (quarantine principal) (role-guardian principal))
	(let ((caller tx-sender))
		(begin
			(asserts! (is-authorized caller) ERR-UNAUTHORIZED)
			(var-set circuit-breaker-contract (some circuit-breaker))
			(var-set guard-contract (some guard))
			(var-set quarantine-contract (some quarantine))
			(var-set role-change-guardian-contract (some role-guardian))
			(ok (event-emit contracts-configured circuit-breaker guard quarantine role-guardian))
		)
	)
)

;; Public: Check if transfer is allowed (comprehensive check)
(define-public (check-transfer (recipient principal) (amount uint))
	(match (var-get circuit-breaker-contract)
		circuit-breaker-principal (match (var-get guard-contract)
			guard-principal (match (var-get quarantine-contract)
				quarantine-principal (begin
					;; Check if circuit breaker is paused
					(match (contract-call? circuit-breaker-principal is-paused)
						paused (begin
							(asserts! (not paused) ERR-PAUSED)
							true
						)
						err-value (err ERR-CIRCUIT-BREAKER-CHECK-FAILED)
					)
					;; Check if recipient is quarantined
					(match (contract-call? quarantine-principal is-quarantined recipient)
						quarantined (begin
							(asserts! (not quarantined) ERR-QUARANTINED)
							true
						)
						err-value (err ERR-QUARANTINED)
					)
					;; Check guard policies
					(match (contract-call? guard-principal validate-transfer recipient amount)
						valid (begin
							(asserts! valid ERR-GUARD-CHECK-FAILED)
							true
						)
						err-value (err ERR-GUARD-CHECK-FAILED)
					)
					(ok (event-emit transfer-protected recipient amount false "transfer-allowed"))
				)
				none (err ERR-QUARANTINED)
			)
			none (err ERR-GUARD-CHECK-FAILED)
		)
		none (err ERR-CIRCUIT-BREAKER-CHECK-FAILED)
	)
)

;; Public: Record incident
(define-public (record-incident (incident-type (string-ascii 50)) (details (string-ascii 200)))
	(let ((caller tx-sender))
		(begin
			(asserts! (is-authorized caller) ERR-UNAUTHORIZED)
			(ok (event-emit incident-detected incident-type details))
		)
	)
)

;; Public: Emergency pause (delegates to circuit breaker)
(define-public (emergency-pause)
	(let ((caller tx-sender))
		(begin
			(asserts! (is-authorized caller) ERR-UNAUTHORIZED)
			(match (var-get circuit-breaker-contract)
				circuit-breaker (contract-call? circuit-breaker pause)
				none (err ERR-CIRCUIT-BREAKER-CHECK-FAILED)
			)
		)
	)
)

;; Public: Emergency quarantine (delegates to quarantine contract)
(define-public (emergency-quarantine (recipient principal) (reason (string-ascii 200)) (severity uint))
	(let ((caller tx-sender))
		(begin
			(asserts! (is-authorized caller) ERR-UNAUTHORIZED)
			(match (var-get quarantine-contract)
				quarantine (contract-call? quarantine quarantine-recipient recipient reason severity)
				none (err ERR-QUARANTINED)
			)
		)
	)
)

;; Public: Get contract status
(define-read-only (get-status)
	{
		circuit-breaker: (var-get circuit-breaker-contract),
		guard: (var-get guard-contract),
		quarantine: (var-get quarantine-contract),
		role-change-guardian: (var-get role-change-guardian-contract)
	}
)

;; Public: Get circuit breaker status
(define-read-only (get-circuit-breaker-status)
	(match (var-get circuit-breaker-contract)
		contract (contract-call? contract get-pause-info)
		none none
	)
)

;; Public: Get guard status
(define-read-only (get-guard-status)
	(match (var-get guard-contract)
		contract (contract-call? contract get-spend-cap-info)
		none none
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


artillery file usage 
1. create an event
2. create participant 
3. install npm install -g artillery@latest
3. ymal file config
config:
  target: "http://localhost:3000"
  phases:
    - duration: 1 # durations in s
      arrivalRate: 1900 // 
      maxVusers: 1900 // max no of users hitting server per second
scenarios:
  - name: "Full booking pipeline"
    flow:
      - post:
          url: "/api/stress/book" // mock route for stress testing reason khalti doesnot provide stress testing endpoints
          headers:
            Content-Type: application/json
            x-stress-key: "test-secret-123"
          json: // below is the fillup amount i.e comming form khalti callback
            eventId: "cmqkw4qmu0001kfes4yjn8yz9" // event id 
            participantId: "cmqkvjeam0000kfesndhmqmd1" // participant id
            attendees:
              - name: "User {{ $arrivalCount }}"
                email: "user{{ $arrivalCount }}@example.com"
                category: "GENERAL"
            amounts:
              totalAmount: 1000
              discountAmount: 0
              discountPercentage: 0
              finalAmount: 1000
4. npx artillery run stress.yml
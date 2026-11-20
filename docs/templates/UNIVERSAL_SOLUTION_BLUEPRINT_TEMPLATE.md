# Universal Solution Blueprint

## AI-readable standard Markdown template for every solution

**Template version:** 1.0\
**Status:** Master template --- copy for each solution; preserve this
master.\
**Purpose:** A consistent structure for analysing, designing, building,
validating, deploying and operating any solution.

> **Core rule:** The capability library is a reusable reference. Every
> solution copy retains the full library. Assess each capability for
> that solution. If it is irrelevant, mark `NOT APPLICABLE` and
> optionally explain why. If it has not been assessed, leave the
> analysis blank or mark `NOT ASSESSED`. Never delete a capability
> merely because one solution does not need it.

------------------------------------------------------------------------

# 1. Instructions for every AI assistant and developer

1.  Read the complete solution document before recommending or changing
    anything.
2.  Markdown is the source of truth. UI screens, diagrams, code and
    interactive catalogues are representations of the approved
    requirements.
3.  Keep one unchanged master template and create a separate copy for
    each solution.
4.  Do not invent missing facts, approvals, integrations, test results
    or deployment status. Use `TBD`, `NOT ASSESSED` or leave blank.
5.  Distinguish `CONFIRMED`, `SOURCE-DERIVED`, `PROPOSED`, `ASSUMPTION`
    and `OPEN QUESTION`.
6.  Preserve frozen decisions, repository boundaries, runtime versions,
    architecture and UI constraints unless an authorised change is
    recorded.
7.  Do not assume a capability must be implemented because it appears in
    the library.
8.  Trace requirements to capabilities, architecture, data, APIs,
    screens, tests and releases using stable IDs.
9.  AI may analyse and draft; authorised people approve business, legal,
    financial, security and production decisions.
10. Inspect the actual repository and implementation before claiming
    that a component, integration or service exists.
11. Report files inspected and changed, commands run, test evidence,
    commit and remaining gaps.
12. Never claim a feature is verified or live without evidence.

## 1.1 Standard status values

  Status                 Meaning
  ---------------------- -------------------------------------
  NOT ASSESSED           Not yet reviewed
  APPLICABLE             Needed by this solution
  PARTIALLY APPLICABLE   Only part is needed
  NOT APPLICABLE         Reviewed and intentionally excluded
  PLANNED                Approved for a future phase
  IN DESIGN              Design underway
  IN DEVELOPMENT         Implementation underway
  IMPLEMENTED            Code/configuration exists
  VERIFIED               Acceptance evidence exists
  LIVE                   Released to intended production
  BLOCKED                Cannot proceed; blocker recorded
  DEPRECATED             Retired or being replaced

`IMPLEMENTED` is not `VERIFIED`; `VERIFIED` is not `LIVE`.

## 1.2 Capability assessment row

Use this format for every capability:

  -------------------------------------------------------------------------------------------------------------------------------
  Capability   Capability   Applicability   Priority   Phase   Existing / Solution-specific   Dependencies   Acceptance   Owner
  ID                                                           New        analysis                           evidence     
  ------------ ------------ --------------- ---------- ------- ---------- ------------------- -------------- ------------ -------
  CAP-XXX                                                                                                                 

  -------------------------------------------------------------------------------------------------------------------------------

------------------------------------------------------------------------

# 2. Solution identity and governance

## 2.1 Identity

  Field                                   Value
  --------------------------------------- -------
  Solution name / ID                      
  Product / platform                      
  Business domain / subdomain             
  Business owner / sponsor                
  Product manager                         
  Solution architect                      
  Technical lead                          
  Security / privacy owner                
  Operations owner                        
  Target users / geography / languages    
  Channels and devices                    
  Repository URL / workspace path         
  Authoritative repository and branch     
  Approved baseline commit                
  Current working branch                  
  Runtime / framework / package manager   
  Deployment target                       
  Document owner / review date            
  Lifecycle status                        

## 2.2 Source-of-truth register

  Artifact                   Canonical location / URL   Status   Notes
  -------------------------- -------------------------- -------- -------
  Requirements                                                   
  Solution blueprint                                             
  Capability catalogue                                           
  Architecture diagrams                                          
  API contracts                                                  
  Data model / migrations                                        
  UI design source                                               
  Tests and evidence                                             
  Deployment configuration                                       
  Operations runbook                                             

**Repository boundaries** - Authoritative repository: - Reference-only
repositories: - Explicitly out-of-scope repositories: - Protected
files/directories: - Frozen runtime/toolchain: - Frozen architecture/UI
decisions: - Approval required before changing:

## 2.3 Decision register

  -------------------------------------------------------------------------------------------------------
  Decision   Date       Decision   Evidence / Status                                Approver   Impact
  ID                               reason     (proposed/approved/frozen/rejected)              
  ---------- ---------- ---------- ---------- ------------------------------------- ---------- ----------
  DEC-001                                                                                      

  -------------------------------------------------------------------------------------------------------

## 2.4 Assumptions and open questions

  -------------------------------------------------------------------------------
  ID        Type     Statement   Impact   Owner    Due date Resolution / Status
                                                            evidence     
  --------- -------- ----------- -------- -------- -------- ------------ --------
  ASM-001                                                                

  -------------------------------------------------------------------------------

## 2.5 Scope control

## **In scope**

## **Out of scope / non-goals**

**Change request** - Requested change: - Reason: - Impact on
requirements, capabilities, architecture, data, APIs and UI: - Risk /
migration: - Approver and decision:

------------------------------------------------------------------------

# 3. Business and product definition

## 3.1 Executive summary

-   Problem:
-   Proposed solution:
-   Target users:
-   Value proposition:
-   Business model / revenue:
-   Expected outcomes:
-   Constraints:
-   Current maturity:

## 3.2 Problem evidence

  --------------------------------------------------------------------------
  Problem ID  Stakeholder   Current      Evidence /  Impact      Desired
                            difficulty   source                  outcome
  ----------- ------------- ------------ ----------- ----------- -----------
  PRB-001                                                        

  --------------------------------------------------------------------------

## 3.3 Goals and success measures

  Goal ID    Goal   Metric   Baseline   Target   Due date   Owner
  ---------- ------ -------- ---------- -------- ---------- -------
  GOAL-001                                                  

## 3.4 Personas and stakeholders

  --------------------------------------------------------------------------------------
  Persona ID Role       Context    Needs /           Pain       Channel    Design
                                   jobs-to-be-done   points                implication
  ---------- ---------- ---------- ----------------- ---------- ---------- -------------
  PER-001                                                                  

  --------------------------------------------------------------------------------------

## 3.5 Business responsibility boundaries

-   Who provides the product or service?
-   Who contracts with the end customer?
-   Who fulfils the transaction?
-   Who handles support, warranty, refunds and cancellation?
-   Platform / intermediary / facilitator role:
-   Regulatory, contractual and professional review required:

## 3.6 Journeys and workflows

  -----------------------------------------------------------------------------------------
  Journey   Actor    Trigger   Preconditions   Steps    Exceptions   End      Requirement
  ID                                                                 state    IDs
  --------- -------- --------- --------------- -------- ------------ -------- -------------
  JRN-001                                                                     

  -----------------------------------------------------------------------------------------

## 3.7 Functional requirements

  ----------------------------------------------------------------------------------------
  Requirement   Requirement   Actor      Priority     Acceptance   Capability   Status
  ID                                     (P0/P1/P2)   criteria     IDs          
  ------------- ------------- ---------- ------------ ------------ ------------ ----------
  FR-001                                                                        

  ----------------------------------------------------------------------------------------

## 3.8 Non-functional requirements

  ---------------------------------------------------------------------------------
  NFR ID      Attribute         Target /     Measurement   Acceptance   Status
                                constraint                 threshold    
  ----------- ----------------- ------------ ------------- ------------ -----------
  NFR-001     Availability                                              

  NFR-002     Performance                                               

  NFR-003     Scalability                                               

  NFR-004     Security                                                  

  NFR-005     Privacy                                                   

  NFR-006     Accessibility                                             

  NFR-007     Localisation                                              

  NFR-008     Maintainability                                           

  NFR-009     Portability                                               

  NFR-010     Observability                                             

  NFR-011     Resilience /                                              
              recovery                                                  

  NFR-012     Cost efficiency                                           
  ---------------------------------------------------------------------------------

------------------------------------------------------------------------

# 4. Universal capability library

**Assessment rule:** all capability rows remain in every solution copy.
Fill applicability and analysis only after review. Extend the library
through Section 4.26 when a new industry capability is discovered.

## 4.1 Platform foundation and governance

  -----------------------------------------------------------------------------------
  ID             Capability        Applicability   Priority /     Solution-specific
                                                   phase          analysis
  -------------- ----------------- --------------- -------------- -------------------
  PLT-001        Solution identity                                
                 and metadata                                     

  PLT-002        Domain / product                                 
                 catalogue                                        

  PLT-003        Configuration and                                
                 feature flags                                    

  PLT-004        Environment                                      
                 separation                                       

  PLT-005        Tenant /                                         
                 organisation                                     
                 hierarchy                                        

  PLT-006        Locality / region                                
                 / service-area                                   
                 hierarchy                                        

  PLT-007        Multi-tenant                                     
                 operating model                                  

  PLT-008        Tenant onboarding                                
                 and lifecycle                                    

  PLT-009        Tenant-specific                                  
                 settings and                                     
                 branding                                         

  PLT-010        Role and                                         
                 permission                                       
                 administration                                   

  PLT-011        Audit trail and                                  
                 decision history                                 

  PLT-012        Administrative                                   
                 approvals and                                    
                 review queues                                    

  PLT-013        Operational                                      
                 dashboards and                                   
                 reporting                                        

  PLT-014        Import / export                                  
                 and data                                         
                 portability                                      

  PLT-015        Configuration                                    
                 versioning and                                   
                 rollback                                         
  -----------------------------------------------------------------------------------

## 4.2 Identity, access and user management

  ----------------------------------------------------------------------------------
  ID             Capability       Applicability   Priority /     Solution-specific
                                                  phase          analysis
  -------------- ---------------- --------------- -------------- -------------------
  IAM-001        Registration and                                
                 onboarding                                      

  IAM-002        Mobile OTP                                      
                 authentication                                  

  IAM-003        Password /                                      
                 enterprise                                      
                 identity                                        
                 authentication                                  

  IAM-004        Session and                                     
                 token lifecycle                                 

  IAM-005        Device and                                      
                 session                                         
                 management                                      

  IAM-006        Account recovery                                

  IAM-007        Role-based                                      
                 access control                                  

  IAM-008        Attribute /                                     
                 contextual                                      
                 access control                                  

  IAM-009        Tenant and                                      
                 organisation                                    
                 scope                                           
                 enforcement                                     

  IAM-010        Record ownership                                
                 enforcement                                     

  IAM-011        User profile and                                
                 preferences                                     

  IAM-012        Multiple roles                                  
                 per user                                        

  IAM-013        Staff /                                         
                 delegated user                                  
                 administration                                  

  IAM-014        Account                                         
                 suspension /                                    
                 closure /                                       
                 reactivation                                    

  IAM-015        Consent and                                     
                 communication                                   
                 preferences                                     

  IAM-016        Privileged                                      
                 administrator                                   
                 controls                                        
  ----------------------------------------------------------------------------------

## 4.3 Customer, member and relationship management

  ----------------------------------------------------------------------------------
  ID             Capability       Applicability   Priority /     Solution-specific
                                                  phase          analysis
  -------------- ---------------- --------------- -------------- -------------------
  CRM-001        Customer /                                      
                 member profile                                  

  CRM-002        Multiple                                        
                 addresses and                                   
                 locations                                       

  CRM-003        Family /                                        
                 household /                                     
                 group                                           
                 relationships                                   

  CRM-004        Preferences and                                 
                 language                                        

  CRM-005        Customer history                                
                 and timeline                                    

  CRM-006        Enquiries and                                   
                 lead management                                 

  CRM-007        Customer                                        
                 segmentation                                    
                 (justified,                                     
                 non-sensitive)                                  

  CRM-008        Support case                                    
                 linkage                                         

  CRM-009        Referrals and                                   
                 invitations                                     

  CRM-010        Data access /                                   
                 correction /                                    
                 deletion                                        
                 requests                                        
  ----------------------------------------------------------------------------------

## 4.4 Catalogue, content and knowledge

  ----------------------------------------------------------------------------------
  ID             Capability       Applicability   Priority /     Solution-specific
                                                  phase          analysis
  -------------- ---------------- --------------- -------------- -------------------
  CAT-001        Domain and                                      
                 category                                        
                 taxonomy                                        

  CAT-002        Hierarchical                                    
                 classification                                  

  CAT-003        Product /                                       
                 service /                                       
                 offering                                        
                 catalogue                                       

  CAT-004        Attributes,                                     
                 variants, units                                 
                 and                                             
                 specifications                                  

  CAT-005        Price lists and                                 
                 reference prices                                

  CAT-006        Catalogue search                                
                 and filters                                     

  CAT-007        Multilingual                                    
                 names and                                       
                 descriptions                                    

  CAT-008        Images,                                         
                 documents, video                                
                 and media                                       
                 metadata                                        

  CAT-009        Content                                         
                 publishing and                                  
                 approval                                        

  CAT-010        Content                                         
                 versioning and                                  
                 expiry                                          

  CAT-011        Knowledge base /                                
                 FAQ                                             

  CAT-012        External links                                  
                 and embeds                                      

  CAT-013        Duplicate                                       
                 detection and                                   
                 merge review                                    
  ----------------------------------------------------------------------------------

## 4.5 Discovery, search, matching and geo-services

  --------------------------------------------------------------------------------------
  ID             Capability           Applicability   Priority /     Solution-specific
                                                      phase          analysis
  -------------- -------------------- --------------- -------------- -------------------
  DSC-001        Global search                                       

  DSC-002        Category / attribute                                
                 search                                              

  DSC-003        Locality / proximity                                
                 search                                              

  DSC-004        Radius and                                          
                 service-area                                        
                 filtering                                           

  DSC-005        Maps and geocoding                                  

  DSC-006        Availability-aware                                  
                 discovery                                           

  DSC-007        Provider / vendor                                   
                 matching                                            

  DSC-008        Requirement / quote                                 
                 matching                                            

  DSC-009        Relevance ranking                                   

  DSC-010        Synonyms and                                        
                 transliteration                                     

  DSC-011        Search analytics                                    

  DSC-012        Recommendations and                                 
                 personalisation                                     
  --------------------------------------------------------------------------------------

## 4.6 Marketplace, seller and provider management

  ----------------------------------------------------------------------------------
  ID             Capability       Applicability   Priority /     Solution-specific
                                                  phase          analysis
  -------------- ---------------- --------------- -------------- -------------------
  MKT-001        Seller /                                        
                 provider                                        
                 registration                                    

  MKT-002        Seller /                                        
                 provider profile                                

  MKT-003        Verification and                                
                 approval                                        

  MKT-004        Provider service                                
                 areas                                           

  MKT-005        Provider                                        
                 availability and                                
                 capacity                                        

  MKT-006        Provider                                        
                 catalogue and                                   
                 offerings                                       

  MKT-007        Provider                                        
                 onboarding                                      
                 agreements                                      

  MKT-008        Provider                                        
                 performance                                     
                 metrics                                         

  MKT-009        Suspension and                                  
                 reinstatement                                   

  MKT-010        Featured                                        
                 listings and                                    
                 subscriptions                                   

  MKT-011        Lead routing and                                
                 assignment                                      

  MKT-012        Lead validity,                                  
                 deduplication                                   
                 and charging                                    

  MKT-013        Seller /                                        
                 provider                                        
                 self-service                                    
                 portal                                          

  MKT-014        Marketplace                                     
                 responsibility                                  
                 and disclaimer                                  
                 controls                                        
  ----------------------------------------------------------------------------------

## 4.7 Commerce, cart, order and fulfilment

  ---------------------------------------------------------------------------------
  ID             Capability      Applicability   Priority /     Solution-specific
                                                 phase          analysis
  -------------- --------------- --------------- -------------- -------------------
  COM-001        Product                                        
                 availability                                   
                 and stock                                      

  COM-002        Shopping cart                                  

  COM-003        Cart validation                                
                 and price                                      
                 recalculation                                  

  COM-004        Checkout and                                   
                 order placement                                

  COM-005        Order                                          
                 acceptance /                                   
                 rejection                                      

  COM-006        Order status                                   
                 lifecycle                                      

  COM-007        Order history                                  
                 and repeat                                     
                 order                                          

  COM-008        Partial                                        
                 fulfilment and                                 
                 substitutions                                  

  COM-009        Delivery slot                                  
                 and capacity                                   
                 management                                     

  COM-010        Delivery                                       
                 partner                                        
                 assignment                                     

  COM-011        Delivery                                       
                 tracking and                                   
                 proof                                          

  COM-012        Recurring /                                    
                 subscription                                   
                 orders                                         

  COM-013        Cancellation                                   
                 and refund                                     
                 workflow                                       

  COM-014        Order                                          
                 notifications                                  

  COM-015        Store /                                        
                 fulfilment                                     
                 dashboard                                      
  ---------------------------------------------------------------------------------

## 4.8 Service requests, quotes and work management

  --------------------------------------------------------------------------------
  ID             Capability     Applicability   Priority /     Solution-specific
                                                phase          analysis
  -------------- -------------- --------------- -------------- -------------------
  SRV-001        Service                                       
                 category and                                  
                 package                                       
                 definition                                    

  SRV-002        Fixed-price                                   
                 service                                       
                 booking                                       

  SRV-003        Quote-based                                   
                 service                                       
                 request                                       

  SRV-004        Requirement                                   
                 description                                   
                 and                                           
                 attachments                                   

  SRV-005        Provider                                      
                 accept /                                      
                 reject                                        

  SRV-006        Quote creation                                
                 and revision                                  

  SRV-007        Quote                                         
                 comparison                                    

  SRV-008        Labour /                                      
                 materials /                                   
                 expense                                       
                 breakdown                                     

  SRV-009        Booking and                                   
                 scheduling                                    

  SRV-010        Work                                          
                 assignment and                                
                 progress                                      

  SRV-011        Completion                                    
                 confirmation                                  

  SRV-012        Warranty /                                    
                 complaint                                     
                 window                                        

  SRV-013        Emergency                                     
                 request and                                   
                 timed                                         
                 broadcast                                     

  SRV-014        Rescheduling                                  
                 and                                           
                 cancellation                                  
                 rules                                         
  --------------------------------------------------------------------------------

## 4.9 Events, calendar, reservations and resources

  ----------------------------------------------------------------------------------
  ID             Capability       Applicability   Priority /     Solution-specific
                                                  phase          analysis
  -------------- ---------------- --------------- -------------- -------------------
  EVT-001        Event / function                                
                 definition                                      

  EVT-002        Multi-day event                                 
                 planning                                        

  EVT-003        Multiple                                        
                 services per                                    
                 event                                           

  EVT-004        Vendor enquiries                                
                 and quotes                                      

  EVT-005        Availability                                    
                 calendar                                        

  EVT-006        Tentative hold                                  
                 with expiry                                     

  EVT-007        Booking                                         
                 confirmation                                    

  EVT-008        Double-booking                                  
                 prevention                                      

  EVT-009        Committee /                                     
                 group approval                                  

  EVT-010        Milestone and                                   
                 advance payments                                

  EVT-011        Event reminders                                 
                 and schedule                                    

  EVT-012        Date change /                                   
                 postponement                                    
                 workflow                                        

  EVT-013        Resource                                        
                 capacity and                                    
                 conflict                                        
                 detection                                       
  ----------------------------------------------------------------------------------

## 4.10 Real estate, assets and property records

  --------------------------------------------------------------------------------
  ID             Capability     Applicability   Priority /     Solution-specific
                                                phase          analysis
  -------------- -------------- --------------- -------------- -------------------
  REA-001        Property /                                    
                 asset profile                                 

  REA-002        Separate rent                                 
                 and sale                                      
                 workflows                                     

  REA-003        Listing                                       
                 creation and                                  
                 moderation                                    

  REA-004        Property                                      
                 attributes and                                
                 location                                      

  REA-005        Photos, video                                 
                 and documents                                 

  REA-006        Private                                       
                 document vault                                

  REA-007        Listing                                       
                 verification                                  
                 and approval                                  

  REA-008        Enquiry and                                   
                 masked contact                                

  REA-009        Visit                                         
                 scheduling                                    

  REA-010        Offer and                                     
                 negotiation                                   
                 tracking                                      

  REA-011        Duplicate                                     
                 listing                                       
                 detection                                     

  REA-012        Agreement /                                   
                 transaction                                   
                 record                                        
  --------------------------------------------------------------------------------

## 4.11 Workforce, manpower and contractor operations

  ----------------------------------------------------------------------------------
  ID             Capability       Applicability   Priority /     Solution-specific
                                                  phase          analysis
  -------------- ---------------- --------------- -------------- -------------------
  WRK-001        Worker profile                                  
                 and skills                                      

  WRK-002        Identity /                                      
                 qualification                                   
                 verification                                    

  WRK-003        Worker                                          
                 availability                                    
                 calendar                                        

  WRK-004        Contractor                                      
                 profile                                         

  WRK-005        Job / manpower                                  
                 requirement                                     
                 posting                                         

  WRK-006        Worker matching                                 
                 and application                                 

  WRK-007        Gang / team                                     
                 profile                                         

  WRK-008        Assignment and                                  
                 double-booking                                  
                 prevention                                      

  WRK-009        Attendance and                                  
                 check-in                                        
                 evidence                                        

  WRK-010        Work log and                                    
                 completion                                      
                 evidence                                        

  WRK-011        Wage / payout                                   
                 records                                         

  WRK-012        Overtime / leave                                
                 records                                         

  WRK-013        Worker /                                        
                 contractor                                      
                 disputes                                        

  WRK-014        Employment /                                    
                 intermediary                                    
                 boundary                                        
                 controls                                        
  ----------------------------------------------------------------------------------

## 4.12 Local business directory and lead generation

  ----------------------------------------------------------------------------------
  ID             Capability       Applicability   Priority /     Solution-specific
                                                  phase          analysis
  -------------- ---------------- --------------- -------------- -------------------
  DIR-001        Local business                                  
                 profile                                         

  DIR-002        Business                                        
                 category and                                    
                 locality                                        

  DIR-003        Operating hours                                 
                 and contact                                     
                 actions                                         

  DIR-004        Offers and                                      
                 announcements                                   

  DIR-005        Enquiry capture                                 

  DIR-006        OTP-verified                                    
                 lead capture                                    

  DIR-007        Lead routing to                                 
                 selected                                        
                 providers                                       

  DIR-008        Lead expiry and                                 
                 duplicate                                       
                 prevention                                      

  DIR-009        Lead outcome                                    
                 tracking                                        

  DIR-010        Seller                                          
                 subscriptions /                                 
                 lead charges                                    

  DIR-011        Public profile                                  
                 and SEO metadata                                

  DIR-012        Directory                                       
                 disclaimer and                                  
                 responsibility                                  
                 boundary                                        
  ----------------------------------------------------------------------------------

## 4.13 Payments, finance and commercial controls

  ----------------------------------------------------------------------------------
  ID             Capability       Applicability   Priority /     Solution-specific
                                                  phase          analysis
  -------------- ---------------- --------------- -------------- -------------------
  FIN-001        Price                                           
                 calculation and                                 
                 tax display                                     

  FIN-002        Cash on delivery                                

  FIN-003        UPI intent /                                    
                 payment link                                    

  FIN-004        Payment gateway                                 
                 integration                                     

  FIN-005        Payment intent                                  
                 and confirmation                                

  FIN-006        Payment webhook                                 
                 verification                                    

  FIN-007        Refund and                                      
                 cancellation                                    
                 calculation                                     

  FIN-008        Provider payout                                 
                 records                                         

  FIN-009        Platform                                        
                 commission /                                    
                 fees                                            

  FIN-010        Lead fees and                                   
                 subscriptions                                   

  FIN-011        Reconciliation                                  
                 and settlement                                  

  FIN-012        Ledger /                                        
                 immutable                                       
                 financial audit                                 

  FIN-013        Idempotent                                      
                 financial                                       
                 operations                                      

  FIN-014        Financial                                       
                 dispute handling                                
  ----------------------------------------------------------------------------------

## 4.14 Communications and collaboration

  ---------------------------------------------------------------------------------
  ID             Capability      Applicability   Priority /     Solution-specific
                                                 phase          analysis
  -------------- --------------- --------------- -------------- -------------------
  MSG-001        In-app                                         
                 notifications                                  

  MSG-002        SMS and OTP                                    

  MSG-003        WhatsApp                                       
                 Business                                       
                 notifications                                  

  MSG-004        Email                                          
                 notifications                                  

  MSG-005        Localised                                      
                 templates                                      

  MSG-006        Consent and                                    
                 opt-out                                        
                 management                                     

  MSG-007        Notification                                   
                 preferences and                                
                 routing                                        

  MSG-008        Delivery status                                
                 and retry                                      

  MSG-009        Reminders and                                  
                 scheduled                                      
                 messages                                       

  MSG-010        Support /                                      
                 escalation                                     
                 communication                                  

  MSG-011        Group /                                        
                 committee                                      
                 collaboration                                  
  ---------------------------------------------------------------------------------

## 4.15 Media and document lifecycle

  --------------------------------------------------------------------------------
  ID             Capability     Applicability   Priority /     Solution-specific
                                                phase          analysis
  -------------- -------------- --------------- -------------- -------------------
  MED-001        Secure media                                  
                 upload                                        

  MED-002        File type /                                   
                 size                                          
                 validation                                    

  MED-003        Image                                         
                 compression                                   
                 and thumbnails                                

  MED-004        Private /                                     
                 public media                                  
                 separation                                    

  MED-005        Signed URL                                    
                 access                                        

  MED-006        Metadata and                                  
                 ownership                                     
                 tracking                                      

  MED-007        EXIF /                                        
                 location                                      
                 metadata                                      
                 handling                                      

  MED-008        Document                                      
                 access audit                                  

  MED-009        Retention,                                    
                 expiry and                                    
                 deletion jobs                                 

  MED-010        Malware /                                     
                 content safety                                
                 checks                                        

  MED-011        Media backup                                  
                 and recovery                                  
  --------------------------------------------------------------------------------

## 4.16 AI, OCR, automation and agents

  ----------------------------------------------------------------------------------
  ID             Capability       Applicability   Priority /     Solution-specific
                                                  phase          analysis
  -------------- ---------------- --------------- -------------- -------------------
  AI-001         AI capability                                   
                 inventory and                                   
                 governance                                      

  AI-002         OCR for images                                  
                 and documents                                   

  AI-003         Multilingual OCR                                
                 and text                                        
                 handling                                        

  AI-004         Handwriting                                     
                 recognition and                                 
                 extraction                                      

  AI-005         Structured data                                 
                 extraction                                      

  AI-006         Classification                                  
                 and                                             
                 categorisation                                  

  AI-007         Entity / product                                
                 / catalogue                                     
                 matching                                        

  AI-008         LLM-assisted                                    
                 interpretation                                  

  AI-009         AI-generated                                    
                 draft content                                   

  AI-010         Human review and                                
                 approval                                        

  AI-011         Confidence and                                  
                 uncertainty                                     
                 handling                                        

  AI-012         Prompt and model                                
                 version                                         
                 management                                      

  AI-013         AI input /                                      
                 output cache                                    

  AI-014         AI usage,                                       
                 latency and cost                                
                 tracking                                        

  AI-015         Per-tenant /                                    
                 per-user AI                                     
                 quotas                                          

  AI-016         AI safety,                                      
                 privacy and data                                
                 minimisation                                    

  AI-017         Agent / MCP                                     
                 read-only                                       
                 operations                                      

  AI-018         Human approval                                  
                 for agent write                                 
                 actions                                         

  AI-019         AI audit trail                                  

  AI-020         Fallback path                                   
                 and circuit                                     
                 breaker                                         
  ----------------------------------------------------------------------------------

## 4.17 Trust, reviews, support and disputes

  --------------------------------------------------------------------------------
  ID             Capability     Applicability   Priority /     Solution-specific
                                                phase          analysis
  -------------- -------------- --------------- -------------- -------------------
  TRU-001        Ratings and                                   
                 reviews                                       

  TRU-002        Review                                        
                 eligibility                                   
                 after                                         
                 completion                                    

  TRU-003        Review                                        
                 moderation                                    

  TRU-004        Verification /                                
                 trust badges                                  

  TRU-005        Complaint and                                 
                 support case                                  
                 creation                                      

  TRU-006        Evidence                                      
                 collection                                    

  TRU-007        Dispute                                       
                 workflow and                                  
                 escalation                                    

  TRU-008        Refund / redo                                 
                 / resolution                                  
                 outcomes                                      

  TRU-009        Grievance                                     
                 contact and                                   
                 SLA tracking                                  

  TRU-010        Fraud / abuse                                 
                 reporting                                     
  --------------------------------------------------------------------------------

## 4.18 Administration and business operations

  -----------------------------------------------------------------------------------
  ID             Capability        Applicability   Priority /     Solution-specific
                                                   phase          analysis
  -------------- ----------------- --------------- -------------- -------------------
  ADM-001        Admin dashboard                                  

  ADM-002        Tenant / locality                                
                 administration                                   

  ADM-003        User / provider                                  
                 administration                                   

  ADM-004        Approval queues                                  

  ADM-005        Transaction /                                    
                 booking                                          
                 monitoring                                       

  ADM-006        Dispute and                                      
                 complaint console                                

  ADM-007        AI operations and                                
                 cost dashboard                                   

  ADM-008        Operational                                      
                 reports and                                      
                 exports                                          

  ADM-009        Audit /                                          
                 compliance                                       
                 reporting                                        

  ADM-010        Alerts and                                       
                 exception queues                                 

  ADM-011        Scheduled jobs                                   
                 and expiry                                       
                 processing                                       

  ADM-012        Least-privilege                                  
                 support access                                   
  -----------------------------------------------------------------------------------

## 4.19 Security, privacy and compliance

  ----------------------------------------------------------------------------------
  ID             Capability       Applicability   Priority /     Solution-specific
                                                  phase          analysis
  -------------- ---------------- --------------- -------------- -------------------
  SEC-001        Threat modelling                                

  SEC-002        Secure                                          
                 authentication                                  
                 and sessions                                    

  SEC-003        Server-side                                     
                 authorisation                                   

  SEC-004        Tenant isolation                                
                 tests                                           

  SEC-005        Input validation                                
                 and output                                      
                 encoding                                        

  SEC-006        Parameterised                                   
                 data access                                     

  SEC-007        Rate limiting                                   
                 and abuse                                       
                 protection                                      

  SEC-008        Secrets and key                                 
                 management                                      

  SEC-009        Encryption in                                   
                 transit and at                                  
                 rest                                            

  SEC-010        Sensitive data                                  
                 minimisation                                    

  SEC-011        Consent, purpose                                
                 limitation and                                  
                 revocation                                      

  SEC-012        Data access /                                   
                 correction /                                    
                 deletion                                        

  SEC-013        Retention and                                   
                 deletion                                        
                 evidence                                        

  SEC-014        Audit logging                                   
                 and privileged                                  
                 access review                                   

  SEC-015        Backup, restore                                 
                 and disaster                                    
                 recovery                                        

  SEC-016        Security testing                                
                 and                                             
                 vulnerability                                   
                 management                                      

  SEC-017        Legal /                                         
                 regulatory                                      
                 applicability                                   
                 review                                          

  SEC-018        Terms, contracts                                
                 and disclaimer                                  
                 management                                      

  SEC-019        Incident                                        
                 response and                                    
                 breach readiness                                
  ----------------------------------------------------------------------------------

## 4.20 Integration and external ecosystem

  -----------------------------------------------------------------------------------
  ID             Capability        Applicability   Priority /     Solution-specific
                                                   phase          analysis
  -------------- ----------------- --------------- -------------- -------------------
  INT-001        API integration                                  
                 framework                                        

  INT-002        External identity                                
                 provider                                         

  INT-003        Payment gateway                                  

  INT-004        SMS / WhatsApp /                                 
                 email provider                                   

  INT-005        Maps / geocoding                                 
                 provider                                         

  INT-006        OCR / AI model                                   
                 provider                                         

  INT-007        Accounting / ERP                                 
                 / CRM integration                                

  INT-008        Webhook producer                                 
                 / consumer                                       

  INT-009        Retry, timeout                                   
                 and idempotency                                  

  INT-010        Integration                                      
                 health monitoring                                

  INT-011        Provider adapter                                 
                 / portability                                    
                 layer                                            

  INT-012        Data                                             
                 synchronisation                                  
                 and                                              
                 reconciliation                                   
  -----------------------------------------------------------------------------------

## 4.21 API, event and workflow architecture

  ---------------------------------------------------------------------------------
  ID             Capability      Applicability   Priority /     Solution-specific
                                                 phase          analysis
  -------------- --------------- --------------- -------------- -------------------
  ARC-001        Versioned API                                  
                 contracts                                      

  ARC-002        API gateway and                                
                 routing                                        

  ARC-003        Standard                                       
                 validation and                                 
                 errors                                         

  ARC-004        Pagination,                                    
                 filtering and                                  
                 sorting                                        

  ARC-005        Idempotency for                                
                 critical writes                                

  ARC-006        Batched screen                                 
                 / view-model                                   
                 APIs                                           

  ARC-007        Asynchronous                                   
                 job processing                                 

  ARC-008        Event contracts                                
                 and routing                                    

  ARC-009        Workflow                                       
                 orchestration /                                
                 state machines                                 

  ARC-010        Scheduled jobs                                 
                 and reminders                                  

  ARC-011        Failed-job /                                   
                 dead-letter                                    
                 handling                                       

  ARC-012        Consistency and                                
                 compensation                                   
                 strategy                                       

  ARC-013        API                                            
                 documentation                                  
                 and contract                                   
                 tests                                          
  ---------------------------------------------------------------------------------

## 4.22 Data architecture and lifecycle

  ---------------------------------------------------------------------------------
  ID             Capability      Applicability   Priority /     Solution-specific
                                                 phase          analysis
  -------------- --------------- --------------- -------------- -------------------
  DAT-001        Conceptual data                                
                 model                                          

  DAT-002        Logical data                                   
                 model                                          

  DAT-003        Physical data                                  
                 model                                          

  DAT-004        Stable public                                  
                 identifiers                                    

  DAT-005        Tenant-scoped                                  
                 records                                        

  DAT-006        Data dictionary                                
                 and ownership                                  

  DAT-007        Data validation                                
                 and integrity                                  

  DAT-008        Indexing and                                   
                 query                                          
                 performance                                    

  DAT-009        Schema                                         
                 migration and                                  
                 rollback                                       

  DAT-010        Soft delete /                                  
                 archival                                       

  DAT-011        Data export and                                
                 portability                                    

  DAT-012        Backup and                                     
                 restore                                        
                 validation                                     

  DAT-013        Data quality                                   
                 and duplicate                                  
                 resolution                                     

  DAT-014        Retention and                                  
                 legal hold                                     
  ---------------------------------------------------------------------------------

## 4.23 UX, channels and accessibility

  ------------------------------------------------------------------------------------
  ID             Capability         Applicability   Priority /     Solution-specific
                                                    phase          analysis
  -------------- ------------------ --------------- -------------- -------------------
  UX-001         Responsive                                        
                 mobile-first                                      
                 interface                                         

  UX-002         Desktop / tablet                                  
                 experience                                        

  UX-003         PWA / installable                                 
                 web experience                                    

  UX-004         Native mobile                                     
                 application                                       

  UX-005         Multilingual UI                                   

  UX-006         Accessibility and                                 
                 readable contrast                                 

  UX-007         Large touch                                       
                 targets and simple                                
                 forms                                             

  UX-008         Low-bandwidth /                                   
                 offline-tolerant                                  
                 behaviour                                         

  UX-009         Empty / loading /                                 
                 error / offline                                   
                 states                                            

  UX-010         Search, navigation                                
                 and contextual                                    
                 help                                              

  UX-011         SEO and public                                    
                 landing pages                                     

  UX-012         Design system and                                 
                 reusable                                          
                 components                                        

  UX-013         User research and                                 
                 usability                                         
                 validation                                        
  ------------------------------------------------------------------------------------

## 4.24 DevSecOps, testing and release management

  ---------------------------------------------------------------------------------
  ID             Capability      Applicability   Priority /     Solution-specific
                                                 phase          analysis
  -------------- --------------- --------------- -------------- -------------------
  DEV-001        Repository and                                 
                 branch strategy                                

  DEV-002        Reproducible                                   
                 local                                          
                 development                                    

  DEV-003        Runtime and                                    
                 dependency                                     
                 version control                                

  DEV-004        Lint, type                                     
                 checking and                                   
                 code quality                                   

  DEV-005        Unit tests                                     

  DEV-006        Integration                                    
                 tests                                          

  DEV-007        API contract                                   
                 tests                                          

  DEV-008        End-to-end                                     
                 tests                                          

  DEV-009        Role / tenant                                  
                 isolation tests                                

  DEV-010        Security /                                     
                 dependency                                     
                 scanning                                       

  DEV-011        Build and                                      
                 deployment                                     
                 pipeline                                       

  DEV-012        Environment                                    
                 configuration                                  
                 and secrets                                    

  DEV-013        Release                                        
                 approval and                                   
                 changelog                                      

  DEV-014        Rollback and                                   
                 recovery                                       
                 procedure                                      

  DEV-015        Test evidence                                  
                 and sign-off                                   
  ---------------------------------------------------------------------------------

## 4.25 Observability, reliability and service operations

  ---------------------------------------------------------------------------------
  ID             Capability      Applicability   Priority /     Solution-specific
                                                 phase          analysis
  -------------- --------------- --------------- -------------- -------------------
  SRE-001        Centralised                                    
                 application                                    
                 logs                                           

  SRE-002        Metrics and                                    
                 service                                        
                 dashboards                                     

  SRE-003        Distributed                                    
                 tracing /                                      
                 correlation IDs                                

  SRE-004        Uptime and                                     
                 health checks                                  

  SRE-005        Error and                                      
                 threshold                                      
                 alerts                                         

  SRE-006        Performance and                                
                 capacity                                       
                 monitoring                                     

  SRE-007        Backup                                         
                 monitoring                                     

  SRE-008        Disaster                                       
                 recovery                                       
                 objectives                                     
                 (RTO/RPO)                                      

  SRE-009        Incident                                       
                 management and                                 
                 escalation                                     

  SRE-010        Operational                                    
                 runbooks                                       

  SRE-011        Cost and usage                                 
                 monitoring                                     

  SRE-012        Service-level                                  
                 objectives and                                 
                 reporting                                      
  ---------------------------------------------------------------------------------

## 4.26 Domain-specific extensions

Add capabilities for domains not yet represented. Do not force them into
unrelated categories.

  ----------------------------------------------------------------------------------------
  Extension   Domain /    Capability   Description   Applicability   Related    Owner
  ID          subdomain                                              IDs        
  ----------- ----------- ------------ ------------- --------------- ---------- ----------
  EXT-001                                                                       

  ----------------------------------------------------------------------------------------

------------------------------------------------------------------------

# 5. Solution-specific capability analysis

## 5.1 Domain and capability mapping

  ----------------------------------------------------------------------------------------
  Domain ID Domain   Subdomain   Capability     Applicable          Not        Not Notes
                                 IDs reviewed                applicable   assessed 
  --------- -------- ----------- ------------ ------------ ------------ ---------- -------
  DOM-001                                                                          

  ----------------------------------------------------------------------------------------

## 5.2 Capability decisions

  ------------------------------------------------------------------------
  Capability   Decision    Reason /    Required    Phase       Approver
  ID                       evidence    depth                   
  ------------ ----------- ----------- ----------- ----------- -----------
                                                               

  ------------------------------------------------------------------------

## 5.3 Reuse / build / buy / configure / integrate

  --------------------------------------------------------------------------
  Capability   Delivery    Existing    Gap         Rationale   Portability
  ID           choice      component /                         concern
                           provider                            
  ------------ ----------- ----------- ----------- ----------- -------------
                                                               

  --------------------------------------------------------------------------

## 5.4 Dependencies and gaps

  ----------------------------------------------------------------------------------
  Gap ID    Capability   Gap      Business   Risk     Mitigation   Owner    Phase
            ID                    impact                                    
  --------- ------------ -------- ---------- -------- ------------ -------- --------
  GAP-001                                                                   

  ----------------------------------------------------------------------------------

------------------------------------------------------------------------

# 6. Solution architecture

## 6.1 Architecture principles

-   Business logic location:
-   Presentation / channel separation:
-   Provider-neutral boundaries:
-   API / event approach:
-   Data ownership:
-   Tenant isolation:
-   Security and resilience:
-   Portability:
-   Approved constraints:

## 6.2 System context and boundaries

-   Users and external actors:
-   System boundary:
-   External systems:
-   Trust boundaries:
-   Data exchanged:
-   Explicit exclusions:

## 6.3 Logical architecture

  -----------------------------------------------------------------------------------
  Layer /         Responsibility   Technology / Capability   Deployment   Status
  component                        provider     IDs          location     
  --------------- ---------------- ------------ ------------ ------------ -----------
  Presentation                                                            

  API / gateway                                                           

  Domain services                                                         

  Workflow /                                                              
  event                                                                   

  Data                                                                    

  Identity /                                                              
  security                                                                

  AI / automation                                                         

  Integration                                                             
  adapters                                                                

  Observability                                                           
  -----------------------------------------------------------------------------------

## 6.4 Deployment architecture

-   Development / test / staging / production:
-   Hosting:
-   Network and ingress:
-   Secrets and configuration:
-   Domains and certificates:
-   Backup location:
-   Disaster recovery location:

## 6.5 Architecture decision records

  ADR ID    Context   Options   Decision   Consequences   Status
  --------- --------- --------- ---------- -------------- --------
  ADR-001                                                 

## 6.6 Provider portability

  ------------------------------------------------------------------------------
  Concern          Current     Adapter /   Alternative   Migration   Lock-in
                   provider    interface                 approach    risk
  ---------------- ----------- ----------- ------------- ----------- -----------
  Hosting                                                            

  Database                                                           

  Media                                                              

  Authentication                                                     

  Messaging                                                          

  Payments                                                           

  AI / OCR                                                           

  Workflow / queue                                                   

  Monitoring                                                         
  ------------------------------------------------------------------------------

------------------------------------------------------------------------

# 7. Data, APIs, events and workflows

## 7.1 Entity register

  ----------------------------------------------------------------------------------------
  Entity ID Entity   Purpose   Domain   Tenant    Sensitive?   Retention   Relationships
                               owner    scoped?                            
  --------- -------- --------- -------- --------- ------------ ----------- ---------------
  ENT-001                                                                  

  ----------------------------------------------------------------------------------------

## 7.2 Data dictionary

  ----------------------------------------------------------------------------------
  Entity /   Type       Required?   Validation   Sensitivity   Source     Notes
  field                                                                   
  ---------- ---------- ----------- ------------ ------------- ---------- ----------
                                                                          

  ----------------------------------------------------------------------------------

## 7.3 API catalogue

  -----------------------------------------------------------------------------------------
  API ID    Method   Path    Purpose   Auth /  Tenant   Idempotency   Capability   Status
                                       role    rule                   IDs          
  --------- -------- ------- --------- ------- -------- ------------- ------------ --------
  API-001                                                                          

  -----------------------------------------------------------------------------------------

**API standards** - Base path / versioning: - Authentication: - Request
/ response format: - Error contract: - Pagination and filters: - Rate
limits: - Idempotency: - Validation: - OpenAPI / contract location:

## 7.4 Event catalogue

  --------------------------------------------------------------------------------
  Event ID   Event      Producer   Consumer   Payload    Retry /       Sensitive
                                              contract   idempotency   data?
  ---------- ---------- ---------- ---------- ---------- ------------- -----------
  EVT-001                                                              

  --------------------------------------------------------------------------------

## 7.5 Workflow / state machine register

  -----------------------------------------------------------------------------------
  Workflow   Workflow   States     Allowed       Trigger    Timeout /  Recovery /
  ID                               transitions              expiry     compensation
  ---------- ---------- ---------- ------------- ---------- ---------- --------------
  WF-001                                                               

  -----------------------------------------------------------------------------------

## 7.6 Integration catalogue

  --------------------------------------------------------------------------------------
  Integration   External   Purpose    Direction   Authentication   Failure    Verified
  ID            system                                             handling   evidence
  ------------- ---------- ---------- ----------- ---------------- ---------- ----------
  INT-001                                                                     

  --------------------------------------------------------------------------------------

------------------------------------------------------------------------

# 8. UX and interface specification

## 8.1 Experience constraints

-   Primary users and digital literacy:
-   Mobile / desktop priorities:
-   Languages and localisation:
-   Accessibility:
-   Low-bandwidth behaviour:
-   Approved visual design baseline:
-   Existing UI to preserve:
-   Prohibited redesigns / changes:

## 8.2 Sitemap and navigation

-   Public pages:
-   Authenticated user pages:
-   Provider / partner pages:
-   Admin pages:
-   Mobile navigation:
-   Deep links:

## 8.3 Screen inventory

  ------------------------------------------------------------------------------
  Screen ID  Screen     User role  Main       Data       Capability   Empty /
                                   actions    required   IDs          error /
                                                                      offline
                                                                      states
  ---------- ---------- ---------- ---------- ---------- ------------ ----------
  SCR-001                                                             

  ------------------------------------------------------------------------------

## 8.4 Component inventory

  ----------------------------------------------------------------------------
  Component   Component   Responsibility   Reuse       Existing /  Design
  ID                                       locations   new         reference
  ----------- ----------- ---------------- ----------- ----------- -----------
  UI-001                                                           

  ----------------------------------------------------------------------------

------------------------------------------------------------------------

# 9. AI and automation specification

## 9.1 AI use-case register

  -----------------------------------------------------------------------------------
  AI         Use case Input    Output   Model /    Human       Risk /        Status
  use-case                              provider   approval?   sensitivity   
  ID                                                                         
  ---------- -------- -------- -------- ---------- ----------- ------------- --------
  AIUC-001                                                                   

  -----------------------------------------------------------------------------------

## 9.2 AI governance

-   AI output type (draft / recommendation / classification / other):
-   Human confirmation points:
-   Confidence thresholds:
-   Uncertainty and fallback behaviour:
-   Prompt / model versioning:
-   Cache strategy:
-   Cost and usage limits:
-   Retention and deletion:
-   Audit requirements:
-   Prohibited autonomous actions:

## 9.3 Agent / MCP permissions

  ---------------------------------------------------------------------------
  Agent /     Read          Write         Approval    Audit event Kill switch
  tool        permissions   permissions   gate                    
  ----------- ------------- ------------- ----------- ----------- -----------
                                                                  

  ---------------------------------------------------------------------------

Default: read-only until explicitly authorised. Financial, legal,
identity, access-control, publishing and destructive actions require
human approval.

------------------------------------------------------------------------

# 10. Security, privacy and compliance

## 10.1 Role and permission matrix

  ----------------------------------------------------------------------------
  Resource / Platform   Tenant     End user   Provider / Support    Other
  action     admin      admin                 partner               
  ---------- ---------- ---------- ---------- ---------- ---------- ----------
                                                                    

  ----------------------------------------------------------------------------

## 10.2 Risk register

  -----------------------------------------------------------------------------------
  Risk ID   Threat /  Asset    Likelihood   Impact   Mitigation   Residual   Owner
            failure                                               risk       
  --------- --------- -------- ------------ -------- ------------ ---------- --------
  RSK-001                                                                    

  -----------------------------------------------------------------------------------

## 10.3 Data privacy and lifecycle

  -------------------------------------------------------------------------------
  Data       Purpose    Legal /    Collection   Access     Retention   Deletion
  category              consent    point        roles                  
                        basis to                                       
                        confirm                                        
  ---------- ---------- ---------- ------------ ---------- ----------- ----------
                                                                       

  -------------------------------------------------------------------------------

## 10.4 Compliance assessment

  -------------------------------------------------------------------------------
  Regulation / Potential   Applicability   Evidence /     Owner       Status
  standard     relevance   decision        professional               
                                           advice                     
  ------------ ----------- --------------- -------------- ----------- -----------
                                                                      

  -------------------------------------------------------------------------------

This template is not legal advice. Obtain qualified
jurisdiction-specific advice where required.

------------------------------------------------------------------------

# 11. Implementation lifecycle: zero to production

## Phase 0 --- Discovery and baseline freeze

-   [ ] Identify authoritative repository, branch and commit.
-   [ ] Inspect README, requirements, architecture and relevant source
    files.
-   [ ] Identify reusable components and actual integrations.
-   [ ] Record runtime, framework, package manager and versions.
-   [ ] Record frozen decisions, scope and non-goals.
-   [ ] Assess capability applicability and gaps.
-   [ ] Record assumptions, risks and open questions.
-   [ ] Obtain baseline approval.

**Exit criteria:** source of truth, scope, constraints and baseline are
recorded and approved.

## Phase 1 --- Product and solution design

-   [ ] Confirm personas, journeys and acceptance criteria.
-   [ ] Prioritise P0 / P1 / P2.
-   [ ] Define domains and capability boundaries.
-   [ ] Define roles and permissions.
-   [ ] Define workflows and state machines.
-   [ ] Define data entities and ownership.
-   [ ] Define APIs, events and integrations.
-   [ ] Complete architecture and security decisions.
-   [ ] Approve UX flows and design constraints.

**Exit criteria:** implementation can proceed without guessing at
critical design decisions.

## Phase 2 --- Engineering foundation

-   [ ] Establish branch and commit discipline.
-   [ ] Verify reproducible local setup.
-   [ ] Configure lint, type checks and tests.
-   [ ] Configure environments and secret handling.
-   [ ] Establish API and error conventions.
-   [ ] Establish tenant-scoped data access.
-   [ ] Establish logging, health checks and CI.
-   [ ] Establish migration and rollback approach.

**Exit criteria:** clean baseline build and automated checks pass.

## Phase 3 --- Shared platform capabilities

-   [ ] Implement applicable identity and access.
-   [ ] Implement tenant / organisation / locality model.
-   [ ] Implement profiles and reference data.
-   [ ] Implement notifications and media handling.
-   [ ] Implement audit and admin approvals.
-   [ ] Implement retention and deletion.
-   [ ] Implement observability.

**Exit criteria:** shared services support the first business workflow.

## Phase 4 --- First end-to-end business capability

-   [ ] Implement one prioritised user journey.
-   [ ] Implement server-side validation and authorisation.
-   [ ] Implement persistence and state transitions.
-   [ ] Implement notifications and failure handling.
-   [ ] Implement UI loading, empty, success and error states.
-   [ ] Add unit, integration and end-to-end tests.
-   [ ] Demonstrate with realistic test data.
-   [ ] Record acceptance evidence.

**Exit criteria:** a real business workflow works end to end, not merely
as a UI mock-up.

## Phase 5 --- Additional capabilities

For each capability: confirm applicability, priority and dependencies;
design; implement in a bounded change; test normal/boundary/failure
paths; update documentation; record evidence; update status; obtain
approval.

## Phase 6 --- External integrations and automation

-   [ ] Verify provider credentials and sandbox.
-   [ ] Implement adapter interfaces.
-   [ ] Validate webhook signatures.
-   [ ] Implement retry, timeout and idempotency.
-   [ ] Test outage and recovery.
-   [ ] Validate rate limits and cost.
-   [ ] Verify AI / agent approval gates.
-   [ ] Record real integration evidence.

## Phase 7 --- System validation and readiness

-   [ ] Functional acceptance tests.
-   [ ] Role and tenant-isolation tests.
-   [ ] Security and privacy tests.
-   [ ] Retention and deletion tests.
-   [ ] Performance and load tests.
-   [ ] Accessibility and localisation review.
-   [ ] Backup and restore drill.
-   [ ] Monitoring and alert tests.
-   [ ] Operations runbook review.
-   [ ] Legal / compliance sign-off where required.
-   [ ] User acceptance sign-off.

## Phase 8 --- Deployment and release

-   [ ] Confirm production configuration and secrets.
-   [ ] Back up data and validate migrations.
-   [ ] Confirm domain, TLS and access controls.
-   [ ] Deploy backend and frontend.
-   [ ] Run production smoke tests.
-   [ ] Verify integrations and scheduled jobs.
-   [ ] Verify monitoring and alert routing.
-   [ ] Confirm rollback procedure.
-   [ ] Record release tag, commit and deployment evidence.
-   [ ] Obtain go-live approval.

## Phase 9 --- Operations and improvement

-   [ ] Monitor errors, latency, availability and cost.
-   [ ] Monitor user adoption and business outcomes.
-   [ ] Review support cases and disputes.
-   [ ] Review security and privileged access.
-   [ ] Review AI quality and spend if applicable.
-   [ ] Review backups and recovery readiness.
-   [ ] Prioritise evidence-based improvements.
-   [ ] Update this blueprint and capability statuses.
-   [ ] Retire unused capabilities safely.

------------------------------------------------------------------------

# 12. Testing and acceptance

## 12.1 Test strategy

  ---------------------------------------------------------------------------
  Test level      Scope       Tool /      Entry       Exit        Evidence
                              approach    criteria    criteria    
  --------------- ----------- ----------- ----------- ----------- -----------
  Unit                                                            

  Integration                                                     

  API contract                                                    

  End-to-end                                                      

  Security                                                        

  Performance                                                     

  Accessibility                                                   

  UAT                                                             

  Recovery                                                        
  ---------------------------------------------------------------------------

## 12.2 Acceptance tests

  -------------------------------------------------------------------------------
  Test ID    Requirement / Scenario   Expected   Actual     Evidence   Status
             capability                                                
  ---------- ------------- ---------- ---------- ---------- ---------- ----------
  TST-001                                                              

  -------------------------------------------------------------------------------

## 12.3 Defects

  ---------------------------------------------------------------------------------------
  Defect ID Severity   Description   Reproduction   Root     Fix      Retest     Status
                                                    cause    commit   evidence   
  --------- ---------- ------------- -------------- -------- -------- ---------- --------
  BUG-001                                                                        

  ---------------------------------------------------------------------------------------

## 12.4 Release acceptance

-   [ ] All P0 requirements pass.
-   [ ] No unresolved critical / high security defects.
-   [ ] Role and tenant boundaries verified.
-   [ ] Backup and restore evidence available.
-   [ ] Monitoring and alerts operational.
-   [ ] Privacy and retention verified.
-   [ ] Terms and notices approved.
-   [ ] Support and escalation ready.
-   [ ] Rollback tested or rehearsed.
-   [ ] Business owner accepts release.

------------------------------------------------------------------------

# 13. Deployment, operations and handover

## 13.1 Environment register

  -------------------------------------------------------------------------
  Environment   URL /       Branch /    Data type   Access      Status
                project     version                 owners      
  ------------- ----------- ----------- ----------- ----------- -----------
  Local                                                         

  Development                                                   

  Test                                                          

  Staging                                                       

  Production                                                    
  -------------------------------------------------------------------------

## 13.2 Release record

  ----------------------------------------------------------------------------------
  Release ID Date       Commit     Environment   Deployed   Validation   Rollback
                                                 by                      reference
  ---------- ---------- ---------- ------------- ---------- ------------ -----------
  REL-001                                                                

  ----------------------------------------------------------------------------------

## 13.3 Operations runbook

-   Service overview:
-   Critical dependencies:
-   Health-check procedure:
-   Log locations:
-   Alert channels:
-   Common failure modes:
-   Recovery procedure:
-   Data restore procedure:
-   Escalation contacts:
-   Provider support references:
-   Security incident procedure:

## 13.4 Handover checklist

-   [ ] Architecture and deployment diagrams updated.
-   [ ] Requirements and capability statuses updated.
-   [ ] API and data documentation updated.
-   [ ] Repository, branch and commit recorded.
-   [ ] Environment and secret ownership transferred securely.
-   [ ] Test and release evidence linked.
-   [ ] Known issues and limitations listed.
-   [ ] Operations runbook delivered.
-   [ ] Backup / restore explained.
-   [ ] Support ownership accepted.

## 13.5 Technical debt

  -----------------------------------------------------------------------------------
  ID         Limitation / Impact     Workaround   Remediation   Owner      Target
             debt                                                          
  ---------- ------------ ---------- ------------ ------------- ---------- ----------
  TD-001                                                                   

  -----------------------------------------------------------------------------------

------------------------------------------------------------------------

# 14. Cost, capacity and business measures

## 14.1 Capacity assumptions

  Driver                    Pilot   Growth   Scale Evidence / basis
  ----------------------- ------- -------- ------- ------------------
  Registered users                                 
  Active users                                     
  Transactions / month                             
  API requests / month                             
  Media storage                                    
  AI requests / month                              
  Notifications / month                            

## 14.2 Cost register

  ------------------------------------------------------------------------------
  Component    Provider   Pricing         Estimated Actual monthly Rate-card
                          basis        monthly cost           cost date /
                                                                   assumptions
  ------------ ---------- ---------- -------------- -------------- -------------
  Hosting /                                                        
  compute                                                          

  API /                                                            
  functions                                                        

  Database                                                         

  Media /                                                          
  storage /                                                        
  egress                                                           

  Identity /                                                       
  messaging                                                        

  Payments                                                         

  AI / OCR                                                         

  Monitoring /                                                     
  backup                                                           

  Other                                                            
  ------------------------------------------------------------------------------

## 14.3 Business metrics

  -------------------------------------------------------------------------------
  KPI ID    Metric   Definition      Baseline      Target      Actual Review
                                                                      frequency
  --------- -------- ------------ ----------- ----------- ----------- -----------
  KPI-001                                                             

  -------------------------------------------------------------------------------

------------------------------------------------------------------------

# 15. Traceability and completeness

## 15.1 Traceability matrix

  -----------------------------------------------------------------------------------------
  Requirement   Capability   Architecture   Data     API /      Screen   Test ID  Release
  ID            ID           component      entity   event /                      
                                                     workflow                     
  ------------- ------------ -------------- -------- ---------- -------- -------- ---------
  FR-001                                                                          

  -----------------------------------------------------------------------------------------

## 15.2 Completeness review

  Review question                                       Yes / No / N/A   Evidence / notes
  ----------------------------------------------------- ---------------- ------------------
  Every capability in Section 4 assessed?                                
  Applicable capabilities linked to requirements?                        
  P0 requirements linked to implementation and tests?                    
  Architecture decisions recorded and approved?                          
  Roles and tenant boundaries tested?                                    
  Retention and deletion defined?                                        
  Integrations verified rather than assumed?                             
  AI and agent permissions governed?                                     
  Production and rollback documented?                                    
  Gaps and limitations visible?                                          

## 15.3 Approvals

  Area                   Name / role   Decision   Date   Evidence
  ---------------------- ------------- ---------- ------ ----------
  Business scope                                         
  Product requirements                                   
  Architecture                                           
  Security / privacy                                     
  Testing / UAT                                          
  Production release                                     
  Operations handover                                    

------------------------------------------------------------------------

# 16. Change log and AI session handoff

## 16.1 Document change log

  Version   Date   Author   Sections changed             Reason             Approval
  --------- ------ -------- ---------------------------- ------------------ ----------
  1.0                       Initial universal template   Initial creation   

## 16.2 AI / developer session log

  --------------------------------------------------------------------------------------
  Session   Date    Tool /   Task    Files       Files     Tests /    Commit   Outcome /
  ID                person           inspected   changed   commands            next step
  --------- ------- -------- ------- ----------- --------- ---------- -------- ---------
  SES-001                                                                      

  --------------------------------------------------------------------------------------

## 16.3 Next-session handoff

## **Verified state**

## **Approved baseline**

## **Completed work and evidence**

## **Outstanding work**

## **Known blockers**

## **Do not change**

## **Next exact task**

## **First files / commands to inspect**

## **Acceptance criteria**

------------------------------------------------------------------------

# Appendix A --- Hyperlocal domain starter from the supplied source

This appendix preserves the seven business verticals and common
architecture patterns explicitly described in the uploaded *Hyperlocal
Marketplace Platform (Tamil Nadu): Product, Architecture & Build Plan*.
It is a source-derived reference, not a pre-approved applicability
decision for another solution.

## A1. Shared core

-   OTP login and role-based access.
-   Tenant and locality hierarchy.
-   WhatsApp, SMS and in-app notifications.
-   Audit logs and admin approvals.
-   Tamil / English toggle.
-   Image compression and lazy loading.
-   Later priorities in source: payment gateway, referrals, moderated
    reviews, SEO pages, push notifications and recommendations.

## A2. Daily Essentials

-   Nearby store discovery; catalogue, price, unit and stock.
-   Cart, checkout and order lifecycle.
-   Handwritten-list photo, OCR and AI extraction into an editable
    draft.
-   Customer confirmation before routing.
-   Delivery slots, COD / UPI, order tracking.
-   Store dashboard and delivery assignment.
-   Photo retention and deletion.
-   Later: repeat orders, subscriptions, substitutions, inventory sync,
    Tamil voice ordering and multi-store orders.

## A3. Home Services

-   Service categories and fixed-price packages.
-   Quote-based requests with photos / videos.
-   Provider accept / reject and quote comparison.
-   Labour / materials breakdown.
-   Job status, warranty and complaint window.
-   Later: emergency broadcast, cancellation / rescheduling and reviews.

## A4. Events and Functions

-   Vendor profiles, availability calendar, enquiries and quotes.
-   Tentative holds with expiry and booking confirmation.
-   Multi-day events and multiple vendors.
-   Later: committee approvals, date changes, milestone payments,
    reminders and AI event-brief extraction.

## A5. Seller Directory and Quotes

-   Seller profile, video / social links and reference catalogue.
-   Ask Price / Get Quote, OTP-verified lead and consent.
-   Lead routing, validity and duplicate protection.
-   Directory disclaimer.
-   Later: AI onboarding, lead charges, subscriptions and featured
    listings.
-   Source boundary: reference directory is not cart / checkout /
    platform-delivery e-commerce.

## A6. Real Estate

-   Separate rent and sale flows.
-   Listing creation and admin approval.
-   Photos, video, map, masked contact and enquiry.
-   Visit scheduling and status.
-   Later: duplicate detection, private document vault, offer tracking
    and broker commissions.

## A7. Manpower

-   Worker profile, OTP / ID verification, job posts and search.
-   Availability and double-booking prevention.
-   Ratings.
-   Later: teams, attendance, overtime / leave, payout records and
    disputes.
-   Source identifies legal / compliance risk and recommends qualified
    review of intermediary versus employer positioning.

## A8. Local Business Directory

-   Business profile, category, locality, photos, timings and contact
    action.
-   Later: offers, reviews, enquiries and sponsored listings.

## A9. Source-derived architecture patterns

-   Browser uses REST/JSON; no direct browser access to Data Store,
    media storage or OCR services.
-   Proposed business logic runs server-side in Node.js / TypeScript
    functions.
-   Adapter interfaces for storage, authentication, notifications,
    payments, queue and AI.
-   Batched screen/view-model APIs and asynchronous processing for heavy
    work.
-   Tenant-scoped records with server-side enforcement.
-   AI output remains a draft; customer/admin confirmation precedes
    routing or publishing.
-   AI cost, latency, quotas, cache and fallback are considered.
-   Security includes server-side RBAC, tenant and ownership checks,
    rate limits, secret protection, audit, backups and restore drills.
-   Cloud portability is a design goal; provider capability and cost
    must be verified before implementation.

------------------------------------------------------------------------

# Appendix B --- Create a new solution copy

1.  Copy this master and rename it
    `SOLUTION-NAME_Solution-Blueprint_v1.0.md`.
2.  Fill Sections 2 and 3.
3.  Review every capability in Section 4. Keep every row.
4.  Complete Section 5 with solution-specific decisions.
5.  Complete architecture, data, API, UX, AI and security sections
    before implementation.
6.  Use Section 11 as the controlled delivery lifecycle.
7.  Record test, deployment, handover and traceability evidence.
8.  Update the AI session handoff before ending significant work
    sessions.
9.  Record which master template version the solution copy uses.

**Minimum before coding:** authoritative repository and commit
identified; scope and frozen constraints confirmed; relevant
capabilities assessed; first end-to-end acceptance test agreed.

**End of template.**
--
-- PostgreSQL database dump
--

\restrict 3cFOMraJU1NVbiCqmVqpnoOV5ZeNbwbk5rdU8K2UHaf0jpGFyzngVqnIitQdKgC

-- Dumped from database version 15.18 (Debian 15.18-1.pgdg12+1)
-- Dumped by pg_dump version 15.18 (Debian 15.18-1.pgdg12+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: vector; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;


--
-- Name: EXTENSION vector; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION vector IS 'vector data type and ivfflat and hnsw access methods';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: accounting_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounting_tasks (
    id text NOT NULL,
    tenant_id text NOT NULL,
    lead_id text,
    task_type text NOT NULL,
    description text NOT NULL,
    due_date timestamp(3) without time zone,
    status text DEFAULT 'requested'::text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: active_modules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.active_modules (
    id text NOT NULL,
    tenant_id text NOT NULL,
    module_name text NOT NULL,
    settings text DEFAULT '{}'::text NOT NULL,
    activated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: appointments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appointments (
    id text NOT NULL,
    tenant_id text NOT NULL,
    lead_id text,
    service_name text NOT NULL,
    duration_min integer DEFAULT 60 NOT NULL,
    scheduled_at timestamp(3) without time zone NOT NULL,
    status text DEFAULT 'scheduled'::text NOT NULL,
    notes text,
    reminder_sent boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversations (
    id text NOT NULL,
    tenant_id text NOT NULL,
    instance_name text,
    contact_number text NOT NULL,
    contact_name text,
    profile_picture text,
    status text DEFAULT 'active'::text NOT NULL,
    ai_paused boolean DEFAULT false NOT NULL,
    last_message_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: custom_modules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.custom_modules (
    id text NOT NULL,
    tenant_id text NOT NULL,
    key text NOT NULL,
    icon text DEFAULT '≡ƒÅ¬'::text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    system_prompt text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: document_chunks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_chunks (
    id text NOT NULL,
    document_id text NOT NULL,
    chunk_index integer NOT NULL,
    text_content text NOT NULL,
    embedding public.vector(768),
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documents (
    id text NOT NULL,
    tenant_id text NOT NULL,
    title text NOT NULL,
    content_text text NOT NULL,
    file_url text,
    mime_type text,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: leads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leads (
    id text NOT NULL,
    tenant_id text NOT NULL,
    conversation_id text,
    name text,
    phone text,
    email text,
    status text,
    interested_product text,
    value double precision,
    category text,
    city text,
    estado text,
    source text,
    "lastContactedAt" timestamp(3) without time zone,
    "nextContactAt" timestamp(3) without time zone,
    "contactAttempts" integer DEFAULT 0 NOT NULL,
    partner_id text,
    notes text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id text NOT NULL,
    tenant_id text NOT NULL,
    conversation_id text NOT NULL,
    direction text NOT NULL,
    content text NOT NULL,
    ai_generated boolean DEFAULT false NOT NULL,
    metadata text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: partner_commissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partner_commissions (
    id text NOT NULL,
    partner_id text NOT NULL,
    sale_id text NOT NULL,
    amount double precision NOT NULL,
    type text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: partners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partners (
    id text NOT NULL,
    tenant_id text NOT NULL,
    name text NOT NULL,
    email text,
    "whatsappNumber" text,
    "referralCode" text NOT NULL,
    "commissionRate" double precision DEFAULT 30.0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    id text NOT NULL,
    tenant_id text NOT NULL,
    name text NOT NULL,
    status text DEFAULT 'pendente'::text NOT NULL,
    prazo_entrega timestamp(3) without time zone NOT NULL,
    desconto_aplicado double precision DEFAULT 0 NOT NULL,
    dias_atraso integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: retail_order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.retail_order_items (
    id text NOT NULL,
    retail_order_id text NOT NULL,
    product_name text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    unit_price double precision NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: retail_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.retail_orders (
    id text NOT NULL,
    tenant_id text NOT NULL,
    lead_id text,
    total_amount double precision NOT NULL,
    status text DEFAULT 'cart'::text NOT NULL,
    shipping_address text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: sales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales (
    id text NOT NULL,
    tenant_id text NOT NULL,
    lead_id text,
    product_name text NOT NULL,
    amount double precision NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    payment_link text,
    payment_id text,
    due_date timestamp(3) without time zone,
    paid_at timestamp(3) without time zone,
    notes text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: service_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_orders (
    id text NOT NULL,
    tenant_id text NOT NULL,
    lead_id text,
    device_model text NOT NULL,
    reported_issue text NOT NULL,
    estimated_budget double precision,
    status text DEFAULT 'pending'::text NOT NULL,
    notes text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: system_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_configs (
    id text NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: tenants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenants (
    id text NOT NULL,
    name text NOT NULL,
    phone text NOT NULL,
    plan text DEFAULT 'solo'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    settings text DEFAULT '{}'::text NOT NULL,
    subscription_expires_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id text NOT NULL,
    tenant_id text NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    role text DEFAULT 'agent'::text NOT NULL,
    name text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: whatsapp_instances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_instances (
    id text NOT NULL,
    tenant_id text NOT NULL,
    name text NOT NULL,
    "connectionName" text NOT NULL,
    status text DEFAULT 'connecting'::text NOT NULL,
    phone_number text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
\.


--
-- Data for Name: accounting_tasks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.accounting_tasks (id, tenant_id, lead_id, task_type, description, due_date, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: active_modules; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.active_modules (id, tenant_id, module_name, settings, activated_at) FROM stdin;
\.


--
-- Data for Name: appointments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.appointments (id, tenant_id, lead_id, service_name, duration_min, scheduled_at, status, notes, reminder_sent, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: conversations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.conversations (id, tenant_id, instance_name, contact_number, contact_name, profile_picture, status, ai_paused, last_message_at, created_at) FROM stdin;
\.


--
-- Data for Name: custom_modules; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.custom_modules (id, tenant_id, key, icon, title, description, system_prompt, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: document_chunks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.document_chunks (id, document_id, chunk_index, text_content, embedding, created_at) FROM stdin;
\.


--
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.documents (id, tenant_id, title, content_text, file_url, mime_type, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: leads; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.leads (id, tenant_id, conversation_id, name, phone, email, status, interested_product, value, category, city, estado, source, "lastContactedAt", "nextContactAt", "contactAttempts", partner_id, notes, created_at) FROM stdin;
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.messages (id, tenant_id, conversation_id, direction, content, ai_generated, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: partner_commissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.partner_commissions (id, partner_id, sale_id, amount, type, status, created_at) FROM stdin;
\.


--
-- Data for Name: partners; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.partners (id, tenant_id, name, email, "whatsappNumber", "referralCode", "commissionRate", created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.projects (id, tenant_id, name, status, prazo_entrega, desconto_aplicado, dias_atraso, created_at) FROM stdin;
\.


--
-- Data for Name: retail_order_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.retail_order_items (id, retail_order_id, product_name, quantity, unit_price, created_at) FROM stdin;
\.


--
-- Data for Name: retail_orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.retail_orders (id, tenant_id, lead_id, total_amount, status, shipping_address, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sales; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sales (id, tenant_id, lead_id, product_name, amount, status, payment_link, payment_id, due_date, paid_at, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: service_orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.service_orders (id, tenant_id, lead_id, device_model, reported_issue, estimated_budget, status, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: system_configs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.system_configs (id, key, value, updated_at) FROM stdin;
5377589e-cfe7-4ffd-8e93-7f43cb5882da	payment_provider	none	2026-07-15 17:21:02.786
4b1b03fe-6eb3-4927-aa87-5d08932f0d3d	plan_solo_price	197	2026-07-15 17:21:02.802
5e4eb376-ce03-4ac6-94f2-81053b642c98	plan_pro_price	397	2026-07-15 17:21:02.81
9c0b7444-f548-4c89-9a52-2cd7256d46ed	plan_business_price	997	2026-07-15 17:21:02.816
698e5ea7-64e0-4f2c-bab5-16feb7ffb21f	auto_charge_enabled	false	2026-07-15 17:21:02.82
ca8b65ec-c71d-452d-9f5d-9b1f81de1ccf	auto_charge_days	5	2026-07-15 17:21:02.85
4ee62826-9232-4a9d-9558-ea22d3f463c0	late_fee_percent	2	2026-07-15 17:21:02.856
\.


--
-- Data for Name: tenants; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tenants (id, name, phone, plan, status, settings, subscription_expires_at, created_at) FROM stdin;
c4c13619-a56f-4ff2-82c7-3c4503a10d13	Nexus AI	5588981885499	enterprise	active	{}	2030-12-31 00:00:00	2026-07-15 17:21:02.589
259d2bc2-82ce-4faf-99b3-5cf0cea8762a	Empresa Demo	5511999999999	solo	active	{}	2026-08-14 17:21:02.771	2026-07-15 17:21:02.773
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, tenant_id, email, password_hash, role, name, created_at) FROM stdin;
ecb54453-aaa9-4587-ad71-bdf08e22b211	c4c13619-a56f-4ff2-82c7-3c4503a10d13	admin@nexusai.com.br	$2b$10$KNv4RwYCDOiX86PhWrtmGeOCiFzfRxD/ZEC6SYmzE1s6paNUtXmPy	superadmin	Ruan Gomes	2026-07-15 17:21:02.742
83374443-e33c-4a4b-9024-3e4dd2534764	259d2bc2-82ce-4faf-99b3-5cf0cea8762a	demo@nexusai.com.br	$2b$10$KNv4RwYCDOiX86PhWrtmGeOCiFzfRxD/ZEC6SYmzE1s6paNUtXmPy	admin	Cliente Demo	2026-07-15 17:21:02.779
\.


--
-- Data for Name: whatsapp_instances; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.whatsapp_instances (id, tenant_id, name, "connectionName", status, phone_number, created_at, updated_at) FROM stdin;
\.


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: accounting_tasks accounting_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_tasks
    ADD CONSTRAINT accounting_tasks_pkey PRIMARY KEY (id);


--
-- Name: active_modules active_modules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.active_modules
    ADD CONSTRAINT active_modules_pkey PRIMARY KEY (id);


--
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: custom_modules custom_modules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_modules
    ADD CONSTRAINT custom_modules_pkey PRIMARY KEY (id);


--
-- Name: document_chunks document_chunks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_chunks
    ADD CONSTRAINT document_chunks_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: leads leads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: partner_commissions partner_commissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_commissions
    ADD CONSTRAINT partner_commissions_pkey PRIMARY KEY (id);


--
-- Name: partners partners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partners
    ADD CONSTRAINT partners_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: retail_order_items retail_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.retail_order_items
    ADD CONSTRAINT retail_order_items_pkey PRIMARY KEY (id);


--
-- Name: retail_orders retail_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.retail_orders
    ADD CONSTRAINT retail_orders_pkey PRIMARY KEY (id);


--
-- Name: sales sales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_pkey PRIMARY KEY (id);


--
-- Name: service_orders service_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_orders
    ADD CONSTRAINT service_orders_pkey PRIMARY KEY (id);


--
-- Name: system_configs system_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_configs
    ADD CONSTRAINT system_configs_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_instances whatsapp_instances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_instances
    ADD CONSTRAINT whatsapp_instances_pkey PRIMARY KEY (id);


--
-- Name: accounting_tasks_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounting_tasks_tenant_id_idx ON public.accounting_tasks USING btree (tenant_id);


--
-- Name: active_modules_tenant_id_module_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX active_modules_tenant_id_module_name_key ON public.active_modules USING btree (tenant_id, module_name);


--
-- Name: appointments_scheduled_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX appointments_scheduled_at_idx ON public.appointments USING btree (scheduled_at);


--
-- Name: appointments_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX appointments_tenant_id_idx ON public.appointments USING btree (tenant_id);


--
-- Name: conversations_tenant_id_contact_number_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX conversations_tenant_id_contact_number_key ON public.conversations USING btree (tenant_id, contact_number);


--
-- Name: conversations_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX conversations_tenant_id_idx ON public.conversations USING btree (tenant_id);


--
-- Name: custom_modules_tenant_id_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX custom_modules_tenant_id_key_key ON public.custom_modules USING btree (tenant_id, key);


--
-- Name: document_chunks_document_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX document_chunks_document_id_idx ON public.document_chunks USING btree (document_id);


--
-- Name: documents_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX documents_tenant_id_idx ON public.documents USING btree (tenant_id);


--
-- Name: leads_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX leads_tenant_id_idx ON public.leads USING btree (tenant_id);


--
-- Name: messages_tenant_id_conversation_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX messages_tenant_id_conversation_id_idx ON public.messages USING btree (tenant_id, conversation_id);


--
-- Name: partner_commissions_partner_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX partner_commissions_partner_id_idx ON public.partner_commissions USING btree (partner_id);


--
-- Name: partner_commissions_sale_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX partner_commissions_sale_id_key ON public.partner_commissions USING btree (sale_id);


--
-- Name: partners_referralCode_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "partners_referralCode_key" ON public.partners USING btree ("referralCode");


--
-- Name: partners_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX partners_tenant_id_idx ON public.partners USING btree (tenant_id);


--
-- Name: projects_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX projects_tenant_id_idx ON public.projects USING btree (tenant_id);


--
-- Name: retail_order_items_retail_order_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX retail_order_items_retail_order_id_idx ON public.retail_order_items USING btree (retail_order_id);


--
-- Name: retail_orders_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX retail_orders_tenant_id_idx ON public.retail_orders USING btree (tenant_id);


--
-- Name: sales_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sales_tenant_id_idx ON public.sales USING btree (tenant_id);


--
-- Name: service_orders_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX service_orders_tenant_id_idx ON public.service_orders USING btree (tenant_id);


--
-- Name: system_configs_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX system_configs_key_key ON public.system_configs USING btree (key);


--
-- Name: tenants_phone_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX tenants_phone_key ON public.tenants USING btree (phone);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: whatsapp_instances_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX whatsapp_instances_name_key ON public.whatsapp_instances USING btree (name);


--
-- Name: whatsapp_instances_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX whatsapp_instances_tenant_id_idx ON public.whatsapp_instances USING btree (tenant_id);


--
-- Name: accounting_tasks accounting_tasks_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_tasks
    ADD CONSTRAINT accounting_tasks_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: accounting_tasks accounting_tasks_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_tasks
    ADD CONSTRAINT accounting_tasks_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: active_modules active_modules_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.active_modules
    ADD CONSTRAINT active_modules_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: appointments appointments_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: appointments appointments_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: conversations conversations_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: custom_modules custom_modules_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_modules
    ADD CONSTRAINT custom_modules_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: document_chunks document_chunks_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_chunks
    ADD CONSTRAINT document_chunks_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: documents documents_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: leads leads_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: leads leads_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: leads leads_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: messages messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: messages messages_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: partner_commissions partner_commissions_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_commissions
    ADD CONSTRAINT partner_commissions_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: partner_commissions partner_commissions_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_commissions
    ADD CONSTRAINT partner_commissions_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: partners partners_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partners
    ADD CONSTRAINT partners_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: projects projects_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: retail_order_items retail_order_items_retail_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.retail_order_items
    ADD CONSTRAINT retail_order_items_retail_order_id_fkey FOREIGN KEY (retail_order_id) REFERENCES public.retail_orders(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: retail_orders retail_orders_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.retail_orders
    ADD CONSTRAINT retail_orders_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: retail_orders retail_orders_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.retail_orders
    ADD CONSTRAINT retail_orders_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sales sales_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: sales sales_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: service_orders service_orders_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_orders
    ADD CONSTRAINT service_orders_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: service_orders service_orders_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_orders
    ADD CONSTRAINT service_orders_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: users users_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: whatsapp_instances whatsapp_instances_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_instances
    ADD CONSTRAINT whatsapp_instances_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 3cFOMraJU1NVbiCqmVqpnoOV5ZeNbwbk5rdU8K2UHaf0jpGFyzngVqnIitQdKgC


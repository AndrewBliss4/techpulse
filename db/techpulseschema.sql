--
-- PostgreSQL database dump
--

-- Dumped from database version 17.2
-- Dumped by pg_dump version 17.2

-- Started on 2024-12-12 23:18:55

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 230 (class 1259 OID 91027)
-- Name: feedback; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.feedback (
    feedback_id integer NOT NULL,
    insight_id integer,
    feedback_text text,
    rating integer,
    submitted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT feedback_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE public.feedback OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 91026)
-- Name: feedback_feedback_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.feedback_feedback_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.feedback_feedback_id_seq OWNER TO postgres;

--
-- TOC entry 4946 (class 0 OID 0)
-- Dependencies: 229
-- Name: feedback_feedback_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.feedback_feedback_id_seq OWNED BY public.feedback.feedback_id;


--
-- TOC entry 220 (class 1259 OID 90954)
-- Name: field; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.field (
    field_id integer NOT NULL,
    field_name character varying(255) NOT NULL,
    description text,
    funding bigint
);


ALTER TABLE public.field OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 90953)
-- Name: field_field_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.field_field_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.field_field_id_seq OWNER TO postgres;

--
-- TOC entry 4947 (class 0 OID 0)
-- Dependencies: 219
-- Name: field_field_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.field_field_id_seq OWNED BY public.field.field_id;


--
-- TOC entry 228 (class 1259 OID 91011)
-- Name: insight; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.insight (
    insight_id integer NOT NULL,
    field_id integer,
    insight_text text NOT NULL,
    confidence_score double precision,
    generated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT insight_confidence_score_check CHECK (((confidence_score >= (0)::double precision) AND (confidence_score <= (1)::double precision)))
);


ALTER TABLE public.insight OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 91010)
-- Name: insight_insight_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.insight_insight_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.insight_insight_id_seq OWNER TO postgres;

--
-- TOC entry 4948 (class 0 OID 0)
-- Dependencies: 227
-- Name: insight_insight_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.insight_insight_id_seq OWNED BY public.insight.insight_id;


--
-- TOC entry 232 (class 1259 OID 91043)
-- Name: keyword; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.keyword (
    keyword_id integer NOT NULL,
    data_id integer,
    keyword character varying(255) NOT NULL,
    keyword_count integer DEFAULT 0
);


ALTER TABLE public.keyword OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 91042)
-- Name: keyword_keyword_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.keyword_keyword_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.keyword_keyword_id_seq OWNER TO postgres;

--
-- TOC entry 4949 (class 0 OID 0)
-- Dependencies: 231
-- Name: keyword_keyword_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.keyword_keyword_id_seq OWNED BY public.keyword.keyword_id;


--
-- TOC entry 226 (class 1259 OID 90989)
-- Name: scrapeddata; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.scrapeddata (
    data_id integer NOT NULL,
    field_id integer,
    source_id integer,
    title character varying(255),
    content text,
    scraped_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    published_date date,
    citation_count integer DEFAULT 0,
    job_postings_count integer DEFAULT 0
);


ALTER TABLE public.scrapeddata OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 90988)
-- Name: scrapeddata_data_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.scrapeddata_data_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.scrapeddata_data_id_seq OWNER TO postgres;

--
-- TOC entry 4950 (class 0 OID 0)
-- Dependencies: 225
-- Name: scrapeddata_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.scrapeddata_data_id_seq OWNED BY public.scrapeddata.data_id;


--
-- TOC entry 218 (class 1259 OID 90945)
-- Name: scrapedsources; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.scrapedsources (
    scraped_source_id integer NOT NULL,
    source_name character varying(255) NOT NULL,
    scraped_source_url text NOT NULL,
    article_type character varying(255) NOT NULL
);


ALTER TABLE public.scrapedsources OWNER TO postgres;

--
-- TOC entry 217 (class 1259 OID 90944)
-- Name: scrapedsources_scraped_source_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.scrapedsources_scraped_source_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.scrapedsources_scraped_source_id_seq OWNER TO postgres;

--
-- TOC entry 4951 (class 0 OID 0)
-- Dependencies: 217
-- Name: scrapedsources_scraped_source_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.scrapedsources_scraped_source_id_seq OWNED BY public.scrapedsources.scraped_source_id;


--
-- TOC entry 224 (class 1259 OID 90977)
-- Name: source; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.source (
    source_id integer NOT NULL,
    url_id integer
);


ALTER TABLE public.source OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 90976)
-- Name: source_source_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.source_source_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.source_source_id_seq OWNER TO postgres;

--
-- TOC entry 4952 (class 0 OID 0)
-- Dependencies: 223
-- Name: source_source_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.source_source_id_seq OWNED BY public.source.source_id;


--
-- TOC entry 234 (class 1259 OID 91056)
-- Name: timedmetrics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.timedmetrics (
    timed_metric_id integer NOT NULL,
    metric_1 integer NOT NULL,
    metric_2 integer NOT NULL,
    metric_date date NOT NULL,
    field_id integer
);


ALTER TABLE public.timedmetrics OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 91055)
-- Name: timedmetrics_timed_metric_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.timedmetrics_timed_metric_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.timedmetrics_timed_metric_id_seq OWNER TO postgres;

--
-- TOC entry 4953 (class 0 OID 0)
-- Dependencies: 233
-- Name: timedmetrics_timed_metric_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.timedmetrics_timed_metric_id_seq OWNED BY public.timedmetrics.timed_metric_id;


--
-- TOC entry 222 (class 1259 OID 90963)
-- Name: url; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.url (
    url_id integer NOT NULL,
    url character varying(2083) NOT NULL,
    scraped_source_id integer
);


ALTER TABLE public.url OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 90962)
-- Name: url_url_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.url_url_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.url_url_id_seq OWNER TO postgres;

--
-- TOC entry 4954 (class 0 OID 0)
-- Dependencies: 221
-- Name: url_url_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.url_url_id_seq OWNED BY public.url.url_id;


--
-- TOC entry 4745 (class 2604 OID 91030)
-- Name: feedback feedback_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedback ALTER COLUMN feedback_id SET DEFAULT nextval('public.feedback_feedback_id_seq'::regclass);


--
-- TOC entry 4736 (class 2604 OID 90957)
-- Name: field field_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.field ALTER COLUMN field_id SET DEFAULT nextval('public.field_field_id_seq'::regclass);


--
-- TOC entry 4743 (class 2604 OID 91014)
-- Name: insight insight_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.insight ALTER COLUMN insight_id SET DEFAULT nextval('public.insight_insight_id_seq'::regclass);


--
-- TOC entry 4747 (class 2604 OID 91046)
-- Name: keyword keyword_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.keyword ALTER COLUMN keyword_id SET DEFAULT nextval('public.keyword_keyword_id_seq'::regclass);


--
-- TOC entry 4739 (class 2604 OID 90992)
-- Name: scrapeddata data_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scrapeddata ALTER COLUMN data_id SET DEFAULT nextval('public.scrapeddata_data_id_seq'::regclass);


--
-- TOC entry 4735 (class 2604 OID 90948)
-- Name: scrapedsources scraped_source_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scrapedsources ALTER COLUMN scraped_source_id SET DEFAULT nextval('public.scrapedsources_scraped_source_id_seq'::regclass);


--
-- TOC entry 4738 (class 2604 OID 90980)
-- Name: source source_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.source ALTER COLUMN source_id SET DEFAULT nextval('public.source_source_id_seq'::regclass);


--
-- TOC entry 4749 (class 2604 OID 91059)
-- Name: timedmetrics timed_metric_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.timedmetrics ALTER COLUMN timed_metric_id SET DEFAULT nextval('public.timedmetrics_timed_metric_id_seq'::regclass);


--
-- TOC entry 4737 (class 2604 OID 90966)
-- Name: url url_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.url ALTER COLUMN url_id SET DEFAULT nextval('public.url_url_id_seq'::regclass);


--
-- TOC entry 4936 (class 0 OID 91027)
-- Dependencies: 230
-- Data for Name: feedback; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.feedback (feedback_id, insight_id, feedback_text, rating, submitted_at) FROM stdin;
\.


--
-- TOC entry 4926 (class 0 OID 90954)
-- Dependencies: 220
-- Data for Name: field; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.field (field_id, field_name, description, funding) FROM stdin;
0	TEST	TEST	0
\.


--
-- TOC entry 4934 (class 0 OID 91011)
-- Dependencies: 228
-- Data for Name: insight; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.insight (insight_id, field_id, insight_text, confidence_score, generated_at) FROM stdin;
\.


--
-- TOC entry 4938 (class 0 OID 91043)
-- Dependencies: 232
-- Data for Name: keyword; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.keyword (keyword_id, data_id, keyword, keyword_count) FROM stdin;
\.


--
-- TOC entry 4932 (class 0 OID 90989)
-- Dependencies: 226
-- Data for Name: scrapeddata; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.scrapeddata (data_id, field_id, source_id, title, content, scraped_at, published_date, citation_count, job_postings_count) FROM stdin;
\.


--
-- TOC entry 4924 (class 0 OID 90945)
-- Dependencies: 218
-- Data for Name: scrapedsources; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.scrapedsources (scraped_source_id, source_name, scraped_source_url, article_type) FROM stdin;
0	BCG	https://www.bcg.com/publications	Web Article
\.


--
-- TOC entry 4930 (class 0 OID 90977)
-- Dependencies: 224
-- Data for Name: source; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.source (source_id, url_id) FROM stdin;
\.


--
-- TOC entry 4940 (class 0 OID 91056)
-- Dependencies: 234
-- Data for Name: timedmetrics; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.timedmetrics (timed_metric_id, metric_1, metric_2, metric_date, field_id) FROM stdin;
\.


--
-- TOC entry 4928 (class 0 OID 90963)
-- Dependencies: 222
-- Data for Name: url; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.url (url_id, url, scraped_source_id) FROM stdin;
\.


--
-- TOC entry 4955 (class 0 OID 0)
-- Dependencies: 229
-- Name: feedback_feedback_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.feedback_feedback_id_seq', 1, false);


--
-- TOC entry 4956 (class 0 OID 0)
-- Dependencies: 219
-- Name: field_field_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.field_field_id_seq', 1, false);


--
-- TOC entry 4957 (class 0 OID 0)
-- Dependencies: 227
-- Name: insight_insight_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.insight_insight_id_seq', 1, false);


--
-- TOC entry 4958 (class 0 OID 0)
-- Dependencies: 231
-- Name: keyword_keyword_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.keyword_keyword_id_seq', 1, false);


--
-- TOC entry 4959 (class 0 OID 0)
-- Dependencies: 225
-- Name: scrapeddata_data_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.scrapeddata_data_id_seq', 1, false);


--
-- TOC entry 4960 (class 0 OID 0)
-- Dependencies: 217
-- Name: scrapedsources_scraped_source_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.scrapedsources_scraped_source_id_seq', 1, false);


--
-- TOC entry 4961 (class 0 OID 0)
-- Dependencies: 223
-- Name: source_source_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.source_source_id_seq', 1, false);


--
-- TOC entry 4962 (class 0 OID 0)
-- Dependencies: 233
-- Name: timedmetrics_timed_metric_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.timedmetrics_timed_metric_id_seq', 1, false);


--
-- TOC entry 4963 (class 0 OID 0)
-- Dependencies: 221
-- Name: url_url_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.url_url_id_seq', 1, false);


--
-- TOC entry 4765 (class 2606 OID 91036)
-- Name: feedback feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_pkey PRIMARY KEY (feedback_id);


--
-- TOC entry 4755 (class 2606 OID 90961)
-- Name: field field_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.field
    ADD CONSTRAINT field_pkey PRIMARY KEY (field_id);


--
-- TOC entry 4763 (class 2606 OID 91020)
-- Name: insight insight_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.insight
    ADD CONSTRAINT insight_pkey PRIMARY KEY (insight_id);


--
-- TOC entry 4767 (class 2606 OID 91049)
-- Name: keyword keyword_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.keyword
    ADD CONSTRAINT keyword_pkey PRIMARY KEY (keyword_id);


--
-- TOC entry 4761 (class 2606 OID 90999)
-- Name: scrapeddata scrapeddata_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scrapeddata
    ADD CONSTRAINT scrapeddata_pkey PRIMARY KEY (data_id);


--
-- TOC entry 4753 (class 2606 OID 90952)
-- Name: scrapedsources scrapedsources_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scrapedsources
    ADD CONSTRAINT scrapedsources_pkey PRIMARY KEY (scraped_source_id);


--
-- TOC entry 4759 (class 2606 OID 90982)
-- Name: source source_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.source
    ADD CONSTRAINT source_pkey PRIMARY KEY (source_id);


--
-- TOC entry 4769 (class 2606 OID 91061)
-- Name: timedmetrics timedmetrics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.timedmetrics
    ADD CONSTRAINT timedmetrics_pkey PRIMARY KEY (timed_metric_id);


--
-- TOC entry 4757 (class 2606 OID 90970)
-- Name: url url_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.url
    ADD CONSTRAINT url_pkey PRIMARY KEY (url_id);


--
-- TOC entry 4775 (class 2606 OID 91037)
-- Name: feedback feedback_insight_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_insight_id_fkey FOREIGN KEY (insight_id) REFERENCES public.insight(insight_id) ON DELETE CASCADE;


--
-- TOC entry 4774 (class 2606 OID 91021)
-- Name: insight insight_field_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.insight
    ADD CONSTRAINT insight_field_id_fkey FOREIGN KEY (field_id) REFERENCES public.field(field_id) ON DELETE CASCADE;


--
-- TOC entry 4776 (class 2606 OID 91050)
-- Name: keyword keyword_data_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.keyword
    ADD CONSTRAINT keyword_data_id_fkey FOREIGN KEY (data_id) REFERENCES public.scrapeddata(data_id) ON DELETE CASCADE;


--
-- TOC entry 4772 (class 2606 OID 91000)
-- Name: scrapeddata scrapeddata_field_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scrapeddata
    ADD CONSTRAINT scrapeddata_field_id_fkey FOREIGN KEY (field_id) REFERENCES public.field(field_id) ON DELETE CASCADE;


--
-- TOC entry 4773 (class 2606 OID 91005)
-- Name: scrapeddata scrapeddata_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scrapeddata
    ADD CONSTRAINT scrapeddata_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.source(source_id) ON DELETE CASCADE;


--
-- TOC entry 4771 (class 2606 OID 90983)
-- Name: source source_url_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.source
    ADD CONSTRAINT source_url_id_fkey FOREIGN KEY (url_id) REFERENCES public.url(url_id) ON DELETE CASCADE;


--
-- TOC entry 4777 (class 2606 OID 91062)
-- Name: timedmetrics timedmetrics_field_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.timedmetrics
    ADD CONSTRAINT timedmetrics_field_id_fkey FOREIGN KEY (field_id) REFERENCES public.field(field_id) ON DELETE CASCADE;


--
-- TOC entry 4770 (class 2606 OID 90971)
-- Name: url url_scraped_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.url
    ADD CONSTRAINT url_scraped_source_id_fkey FOREIGN KEY (scraped_source_id) REFERENCES public.scrapedsources(scraped_source_id) ON DELETE CASCADE;


-- Completed on 2024-12-12 23:18:56

--
-- PostgreSQL database dump complete
--


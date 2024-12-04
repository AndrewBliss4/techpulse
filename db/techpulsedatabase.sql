--
-- PostgreSQL database dump
--

-- Dumped from database version 17.2
-- Dumped by pg_dump version 17.2

-- Started on 2024-12-03 23:03:18

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
-- TOC entry 228 (class 1259 OID 49392)
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
-- TOC entry 227 (class 1259 OID 49391)
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
-- TOC entry 4910 (class 0 OID 0)
-- Dependencies: 227
-- Name: feedback_feedback_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.feedback_feedback_id_seq OWNED BY public.feedback.feedback_id;


--
-- TOC entry 218 (class 1259 OID 49324)
-- Name: field; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.field (
    field_id integer NOT NULL,
    field_name character varying(255) NOT NULL,
    description text
);


ALTER TABLE public.field OWNER TO postgres;

--
-- TOC entry 217 (class 1259 OID 49323)
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
-- TOC entry 4911 (class 0 OID 0)
-- Dependencies: 217
-- Name: field_field_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.field_field_id_seq OWNED BY public.field.field_id;


--
-- TOC entry 226 (class 1259 OID 49376)
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
-- TOC entry 225 (class 1259 OID 49375)
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
-- TOC entry 4912 (class 0 OID 0)
-- Dependencies: 225
-- Name: insight_insight_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.insight_insight_id_seq OWNED BY public.insight.insight_id;


--
-- TOC entry 230 (class 1259 OID 49408)
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
-- TOC entry 229 (class 1259 OID 49407)
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
-- TOC entry 4913 (class 0 OID 0)
-- Dependencies: 229
-- Name: keyword_keyword_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.keyword_keyword_id_seq OWNED BY public.keyword.keyword_id;


--
-- TOC entry 224 (class 1259 OID 49354)
-- Name: scrapeddata; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.scrapeddata (
    data_id integer NOT NULL,
    field_id integer,
    source_id integer,
    title character varying(255),
    content text,
    scraped_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    citation_count integer DEFAULT 0,
    job_postings_count integer DEFAULT 0
);


ALTER TABLE public.scrapeddata OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 49353)
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
-- TOC entry 4914 (class 0 OID 0)
-- Dependencies: 223
-- Name: scrapeddata_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.scrapeddata_data_id_seq OWNED BY public.scrapeddata.data_id;


--
-- TOC entry 222 (class 1259 OID 49342)
-- Name: source; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.source (
    source_id integer NOT NULL,
    url_id integer
);


ALTER TABLE public.source OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 49341)
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
-- TOC entry 4915 (class 0 OID 0)
-- Dependencies: 221
-- Name: source_source_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.source_source_id_seq OWNED BY public.source.source_id;


--
-- TOC entry 220 (class 1259 OID 49333)
-- Name: url; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.url (
    url_id integer NOT NULL,
    url character varying(2083) NOT NULL,
    source_type character varying(255) NOT NULL,
    source_name character varying(255) NOT NULL
);


ALTER TABLE public.url OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 49332)
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
-- TOC entry 4916 (class 0 OID 0)
-- Dependencies: 219
-- Name: url_url_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.url_url_id_seq OWNED BY public.url.url_id;


--
-- TOC entry 4734 (class 2604 OID 49395)
-- Name: feedback feedback_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedback ALTER COLUMN feedback_id SET DEFAULT nextval('public.feedback_feedback_id_seq'::regclass);


--
-- TOC entry 4725 (class 2604 OID 49327)
-- Name: field field_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.field ALTER COLUMN field_id SET DEFAULT nextval('public.field_field_id_seq'::regclass);


--
-- TOC entry 4732 (class 2604 OID 49379)
-- Name: insight insight_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.insight ALTER COLUMN insight_id SET DEFAULT nextval('public.insight_insight_id_seq'::regclass);


--
-- TOC entry 4736 (class 2604 OID 49411)
-- Name: keyword keyword_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.keyword ALTER COLUMN keyword_id SET DEFAULT nextval('public.keyword_keyword_id_seq'::regclass);


--
-- TOC entry 4728 (class 2604 OID 49357)
-- Name: scrapeddata data_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scrapeddata ALTER COLUMN data_id SET DEFAULT nextval('public.scrapeddata_data_id_seq'::regclass);


--
-- TOC entry 4727 (class 2604 OID 49345)
-- Name: source source_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.source ALTER COLUMN source_id SET DEFAULT nextval('public.source_source_id_seq'::regclass);


--
-- TOC entry 4726 (class 2604 OID 49336)
-- Name: url url_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.url ALTER COLUMN url_id SET DEFAULT nextval('public.url_url_id_seq'::regclass);


--
-- TOC entry 4751 (class 2606 OID 49401)
-- Name: feedback feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_pkey PRIMARY KEY (feedback_id);


--
-- TOC entry 4741 (class 2606 OID 49331)
-- Name: field field_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.field
    ADD CONSTRAINT field_pkey PRIMARY KEY (field_id);


--
-- TOC entry 4749 (class 2606 OID 49385)
-- Name: insight insight_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.insight
    ADD CONSTRAINT insight_pkey PRIMARY KEY (insight_id);


--
-- TOC entry 4753 (class 2606 OID 49414)
-- Name: keyword keyword_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.keyword
    ADD CONSTRAINT keyword_pkey PRIMARY KEY (keyword_id);


--
-- TOC entry 4747 (class 2606 OID 49364)
-- Name: scrapeddata scrapeddata_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scrapeddata
    ADD CONSTRAINT scrapeddata_pkey PRIMARY KEY (data_id);


--
-- TOC entry 4745 (class 2606 OID 49347)
-- Name: source source_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.source
    ADD CONSTRAINT source_pkey PRIMARY KEY (source_id);


--
-- TOC entry 4743 (class 2606 OID 49340)
-- Name: url url_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.url
    ADD CONSTRAINT url_pkey PRIMARY KEY (url_id);


--
-- TOC entry 4758 (class 2606 OID 49402)
-- Name: feedback feedback_insight_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_insight_id_fkey FOREIGN KEY (insight_id) REFERENCES public.insight(insight_id) ON DELETE CASCADE;


--
-- TOC entry 4757 (class 2606 OID 49386)
-- Name: insight insight_field_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.insight
    ADD CONSTRAINT insight_field_id_fkey FOREIGN KEY (field_id) REFERENCES public.field(field_id) ON DELETE CASCADE;


--
-- TOC entry 4759 (class 2606 OID 49415)
-- Name: keyword keyword_data_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.keyword
    ADD CONSTRAINT keyword_data_id_fkey FOREIGN KEY (data_id) REFERENCES public.scrapeddata(data_id) ON DELETE CASCADE;


--
-- TOC entry 4755 (class 2606 OID 49365)
-- Name: scrapeddata scrapeddata_field_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scrapeddata
    ADD CONSTRAINT scrapeddata_field_id_fkey FOREIGN KEY (field_id) REFERENCES public.field(field_id) ON DELETE CASCADE;


--
-- TOC entry 4756 (class 2606 OID 49370)
-- Name: scrapeddata scrapeddata_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scrapeddata
    ADD CONSTRAINT scrapeddata_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.source(source_id) ON DELETE CASCADE;


--
-- TOC entry 4754 (class 2606 OID 49348)
-- Name: source source_url_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.source
    ADD CONSTRAINT source_url_id_fkey FOREIGN KEY (url_id) REFERENCES public.url(url_id) ON DELETE CASCADE;


-- Completed on 2024-12-03 23:03:19

--
-- PostgreSQL database dump complete
--


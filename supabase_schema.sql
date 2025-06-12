-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.classes (
  class_id character varying NOT NULL,
  class_name character varying NOT NULL,
  CONSTRAINT classes_pkey PRIMARY KEY (class_id)
);
CREATE TABLE public.participants (
  nrp character varying NOT NULL,
  full_name character varying NOT NULL,
  group_id character varying,
  CONSTRAINT participants_pkey PRIMARY KEY (nrp),
  CONSTRAINT participants_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.project_groups(group_id)
);
CREATE TABLE public.peer_ratings (
  rating_id integer NOT NULL DEFAULT nextval('peer_ratings_rating_id_seq'::regclass),
  rater_id character varying NOT NULL,
  ratee_id character varying NOT NULL,
  rating_score integer NOT NULL CHECK (rating_score >= 1 AND rating_score <= 5),
  rating_comment text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT peer_ratings_pkey PRIMARY KEY (rating_id),
  CONSTRAINT peer_ratings_ratee_id_fkey FOREIGN KEY (ratee_id) REFERENCES public.participants(nrp),
  CONSTRAINT peer_ratings_rater_id_fkey FOREIGN KEY (rater_id) REFERENCES public.participants(nrp)
);
CREATE TABLE public.project_groups (
  group_id character varying NOT NULL,
  class_id character varying NOT NULL,
  group_name text NOT NULL,
  CONSTRAINT project_groups_pkey PRIMARY KEY (group_id),
  CONSTRAINT project_groups_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(class_id)
);
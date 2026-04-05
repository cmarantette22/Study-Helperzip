--
-- PostgreSQL database dump
--

\restrict LzdU7i0hNrwo1g2lCBnkhPTYT5T3sBlcNa6mToAOJvglQzdynv3epkP6tOWmQzE

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: choices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.choices (
    id integer NOT NULL,
    question_id integer NOT NULL,
    label text NOT NULL,
    text text NOT NULL,
    is_correct boolean DEFAULT false NOT NULL
);


ALTER TABLE public.choices OWNER TO postgres;

--
-- Name: choices_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.choices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.choices_id_seq OWNER TO postgres;

--
-- Name: choices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.choices_id_seq OWNED BY public.choices.id;


--
-- Name: outline_sections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.outline_sections (
    id integer NOT NULL,
    project_id integer NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    order_index integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.outline_sections OWNER TO postgres;

--
-- Name: outline_sections_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.outline_sections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.outline_sections_id_seq OWNER TO postgres;

--
-- Name: outline_sections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.outline_sections_id_seq OWNED BY public.outline_sections.id;


--
-- Name: projects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.projects (
    id integer NOT NULL,
    name text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.projects OWNER TO postgres;

--
-- Name: projects_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.projects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.projects_id_seq OWNER TO postgres;

--
-- Name: projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.projects_id_seq OWNED BY public.projects.id;


--
-- Name: questions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.questions (
    id integer NOT NULL,
    question_text text NOT NULL,
    answered boolean DEFAULT false NOT NULL,
    answered_correctly boolean,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    project_id integer,
    multi_select boolean DEFAULT false NOT NULL,
    explanations jsonb,
    deep_explanation jsonb,
    chat_messages jsonb
);


ALTER TABLE public.questions OWNER TO postgres;

--
-- Name: questions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.questions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.questions_id_seq OWNER TO postgres;

--
-- Name: questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.questions_id_seq OWNED BY public.questions.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    role text DEFAULT 'user'::text NOT NULL,
    must_change_password boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: choices id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.choices ALTER COLUMN id SET DEFAULT nextval('public.choices_id_seq'::regclass);


--
-- Name: outline_sections id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.outline_sections ALTER COLUMN id SET DEFAULT nextval('public.outline_sections_id_seq'::regclass);


--
-- Name: projects id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects ALTER COLUMN id SET DEFAULT nextval('public.projects_id_seq'::regclass);


--
-- Name: questions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.questions ALTER COLUMN id SET DEFAULT nextval('public.questions_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: choices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.choices (id, question_id, label, text, is_correct) FROM stdin;
136	34	A	intersection of the demand and supply curves	t
137	34	B	intersection of the demand curve and the quantity axis	f
138	34	C	intersection of the demand curve and the price axis	f
139	34	D	tangency between the demand and supply curves	f
140	35	A	As the price of smartphones falls, consumers buy more of them.	f
141	35	B	As the market price of corn rises, farmers allocate more of their land to planting corn.	t
142	35	C	A technological breakthrough makes producing solar panels cheaper.	f
143	35	D	The government imposes a price ceiling on apartment rentals.	f
144	36	A	The demand curve will shift to the left, lowering the price.	f
145	36	B	The supply curve will shift to the right, lowering the price.	f
146	36	C	The supply curve will shift to the left, raising the price.	t
147	36	D	Both supply and demand will shift to the left, keeping the price unchanged.	f
148	37	A	The demand for movie tickets will decrease because they are complements.	f
149	37	B	The demand for movie tickets will increase because they are substitutes.	t
150	37	C	The supply of movie tickets will increase to meet the new demand.	f
151	37	D	The market for movie tickets will be unaffected.	f
152	38	A	a shortage of the good to develop.	f
153	38	B	the quantity demanded to exceed the quantity supplied.	f
154	38	C	a surplus of the good to develop.	t
155	38	D	the demand curve to shift to the right to clear the market.	f
156	39	A	$10	f
157	39	B	$20	t
158	39	C	$25	f
159	39	D	$40	f
160	40	A	The equilibrium price will definitely rise, but the effect on equilibrium quantity is ambigu- ous.	t
161	40	B	The equilibrium quantity will definitely rise, but the effect on equilibrium price is ambigu- ous.	f
162	40	C	Both the equilibrium price and quantity will definitely increase.	f
163	40	D	Both the equilibrium price and quantity will definitely decrease.	f
164	41	A	10 units	t
165	41	B	20 units	f
166	41	C	25 units	f
167	41	D	50 units	f
168	42	A	The budget constraint will shift parallel and outward.	f
169	42	B	The budget constraint will shift parallel and inward.	f
170	42	C	The slope of the budget constraint will become twice as steep.	f
171	42	D	The budget constraint will not change at all.	t
172	43	A	1/3 of a milkshake	f
173	43	B	3 milkshakes	t
174	43	C	$10	f
175	43	D	$20	f
176	44	A	It increases, because consumers value the good more.	f
177	44	B	It decreases, because the gap between willingness to pay and market price shrinks.	t
178	44	C	It remains the same, because consumer surplus is determined only by the demand curve.	f
179	44	D	It becomes negative.	f
180	45	A	elastic.	f
181	45	B	unit elastic.	f
182	45	C	inelastic.	t
183	45	D	perfectly elastic.	f
184	46	A	0.5	f
185	46	B	1.0	t
186	46	C	1.5	f
187	46	D	2.0	f
188	47	A	perfectly inelastic.	f
189	47	B	relatively inelastic.	f
190	47	C	unit elastic.	f
191	47	D	relatively elastic.	t
192	48	A	An inferior good is a good whose quantity supplied always exceeds its quantity demanded.	f
193	48	B	An inferior good is a good whose demand decreases with an increase in consumers’ income.	t
194	48	C	An inferior good is a good that is sold at a subsidized price.	f
195	48	D	An inferior good is a good that is rationed by the government.	f
196	49	A	18	t
197	49	B	24	f
198	49	C	108	f
199	49	D	198	f
200	50	A	4 burgers and 1 order of fries	f
201	50	B	3 burgers and 3 orders of fries	t
202	50	C	2 burgers and 5 orders of fries	f
203	50	D	1 burger and 2 orders of fries	f
204	51	A	10	f
205	51	B	25	t
206	51	C	50	f
207	51	D	100	f
208	52	A	Good A and Good B are strong substitutes.	f
209	52	B	Good A and Good B are strong complements.	t
210	52	C	Good A is a normal good and Good B is an inferior good.	f
211	52	D	The demand for both goods is highly elastic.	f
212	53	A	A specific brand of bottled water, such as Dasani	t
213	53	B	Drinking water in general	f
214	53	C	Electricity for home heating	f
215	53	D	Life-saving insulin for a diabetic patient	f
216	54	A	-0.5; Inferior good	t
217	54	B	+0.5; Normal good	f
218	54	C	-2.0; Inferior good	f
219	54	D	+2.0; Luxury good	f
220	55	A	$10	f
221	55	B	$30	t
222	55	C	$40	f
223	55	D	$80	f
224	56	A	There will be movement along the demand curve, leading to a higher price.	f
225	56	B	The demand curve will shift to the right, leading to a higher equilibrium price and quantity.	t
226	56	C	The supply curve will shift to the right, leading to a lower price and higher quantity.	f
227	56	D	The demand curve will shift to the left, leading to a lower equilibrium price.	f
228	57	A	downward sloping.	f
229	57	B	perfectly inelastic.	f
230	57	C	perfectly elastic.	t
231	57	D	unit elastic.	f
232	58	A	Because the government legally mandates the price they must charge.	f
233	58	B	Because they collude with other firms to set a fixed price.	f
234	58	C	Because their individual output is so small relative to the market that they cannot influence the market price.	t
235	58	D	Because they produce a unique product with no close substitutes.	f
236	59	A	A surplus of 20 units	f
237	59	B	A shortage of 20 units	t
238	59	C	The market is in equilibrium	f
239	59	D	A shortage of 40 units	f
240	60	A	less than zero.	f
241	60	B	exactly zero.	f
242	60	C	between zero and one.	f
243	60	D	greater than one.	t
244	61	A	-1.0	f
245	61	B	0.5	f
246	61	C	1.0	t
247	61	D	2.0	f
248	62	A	0.5 chapters of economics	f
249	62	B	2 chapters of economics	t
250	62	C	4 chapters of economics	f
251	62	D	8 chapters of economics	f
252	63	A	Profit	t
253	63	B	Revenue	f
254	63	C	Profit per unit sold	f
255	63	D	Quantity	f
\.


--
-- Data for Name: outline_sections; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.outline_sections (id, project_id, title, content, order_index, created_at) FROM stdin;
1	1	Midterm 2 Overview (Principles of Microeconomics ECON 202)	OUTLINE FOR MIDTERM 2\nPRINCIPLES OF MICROECONOMICS (ECON 202)\nDr. Jakub Tecza\nMarch 27, 2026\n\nChapters covered:\n1. Chapter 4 (Demand, Supply and Equilibrium)\n2. Chapter 5 (Consumers and Incentives)\n3. Chapter 6 (Sellers and Incentives) — Section 6.1, and part of Section 6.2 only\n\nNote: Below is a list of key concepts for Midterm 2. The most relevant are highlighted in bold (not shown here in formatting), but any of these can come up. The ones that are crossed out will not be on the exam.\n\nExam structure:\n- 30 questions total\n- 8 questions on Chapter 4\n- 20 questions on Chapter 5\n- 2 questions on Chapter 6\n- About half of the questions will involve some level of math/calculations.\n\nInstructor note on terminology distinctions:\n- The difference between demand and quantity demanded, as well as between supply and quantity supplied, causes confusion. While many textbooks emphasize this distinction, for this exam it is treated as a technicality and will not be emphasized.	0	2026-03-30 22:12:54.496573
2	1	Chapter 4: Demand, Supply and Equilibrium	Topics:\n- The Definition of Markets\n- Law of Demand, Demand Schedule, and Demand Curve\n- The Difference Between Qd (quantity demanded) and D (demand)\n- Individual Demand and Market Demand\n- Outside factors affecting demand & demand curve shifts\n\n- Law of Supply, Supply Schedule, and Supply Curve\n- The Difference Between Qs (quantity supplied) and (S) supply\n- Individual Supply and Market Supply\n- Outside factors affecting supply & supply curve shifts\n\n- Market Equilibrium\n- Two Types of Market Disequilibrium (surplus and shortage)\n- Changes in Market Equilibrium (for example, after a change in Supply or Demand)\n- Simultaneous shifts in Supply and Demand (Double Shifts)	1	2026-03-30 22:12:54.577005
3	1	Chapter 5: Consumers and Incentives	Topics:\n- Buyer’s Problem\n- Three pillars of rational decision for consumers (preferences, budget, prices)\n- Budget Constraint: Graphs, Intercepts and Rotations\n- Total Benefit, Marginal Benefit, and the Equal Marginal Principle\n- Optimizing Consumption: Allocating budgets using Marginal Benefit per Dollar (MB/P)\n- Opportunity Cost calculations and relative prices\n- Deriving the demand curve from buyers’ decisions\n- Consumer surplus\n\nDemand elasticities (calculation and interpretation):\n- Price elasticity of demand\n- Cross-price elasticity of demand\n- Income elasticity of demand\n\nElasticity-related relationships and cases:\n- Relationship between demand and income: inferior goods, normal goods, luxury goods\n- Relationship between two goods: substitutes and complements\n- Extreme cases: perfectly elastic and perfectly inelastic demand\n- Relationship between price elasticity of demand and revenue	2	2026-03-30 22:12:54.579936
4	1	Chapter 6: Sellers and Incentives (Section 6.1 and part of 6.2 only)	Topics:\n- Sellers in the perfectly competitive market (Price Takers)\n- Profit maximization and its ingredients	3	2026-03-30 22:12:54.582336
5	1	Relevant Formulas (for Midterm 2)	Market Equilibrium & Disequilibrium (Algebraic)\n1) Equilibrium condition:\n- Qd = Qs\n2) Calculating surplus:\n- Surplus = Qs − Qd (when P > P*)\n3) Calculating shortage:\n- Shortage = Qd − Qs (when P < P*)\n\nBudget constraint:\n- p1 · q1 + p2 · q2 = B\n\nConsumer Optimization Rule (Equal Marginal Principle):\n- MB1 / P1 = MB2 / P2\n\nOpportunity Cost of Good X:\n- OCx = (Px / Py) units of Good Y\n\nConsumer surplus:\n1) Individual:\n- CS = willingness to pay − Pm\n2) Market:\n- CS = 0.5 · Qm · (P(0) − Pm)\n  (triangle area between demand curve and market price)\n\nPrice elasticity of demand:\n1) Definition:\n- εD = (% change in Q) / (% change in P)\n2) Arc/midpoint formula:\n- εD = [(Q2 − Q1) / ((Q1 + Q2)/2)] / [(P2 − P1) / ((P1 + P2)/2)]\nNote: point formulas of elasticities are not required.\n\nCross-price elasticity of demand:\n1) Definition:\n- εxy = (% change in Qx) / (% change in Py)\n2) Arc/midpoint formula:\n- εxy = [(Qx,2 − Qx,1) / ((Qx,1 + Qx,2)/2)] / [(Py,2 − Py,1) / ((Py,1 + Py,2)/2)]\n\nIncome elasticity of demand:\n1) Definition:\n- εI = (% change in Q) / (% change in Income)\n2) Arc/midpoint formula:\n- εI = [(Q2 − Q1) / ((Q1 + Q2)/2)] / [(I2 − I1) / ((I1 + I2)/2)]\n\nPercentage change in revenue:\n- % change in R = % change in P + % change in Q	4	2026-03-30 22:12:54.584643
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.projects (id, name, created_at) FROM stdin;
1	Econ 202 Midterm 2	2026-03-30 21:23:55.170585
2	Math 149	2026-03-31 00:02:05.884916
\.


--
-- Data for Name: questions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.questions (id, question_text, answered, answered_correctly, created_at, project_id, multi_select, explanations, deep_explanation, chat_messages) FROM stdin;
34	The equilibrium quantity in a perfectly competitive market is determined at the point of:	f	\N	2026-03-31 00:06:48.75344	2	f	\N	\N	\N
35	Which of the following scenarios best illustrates the Law of Supply?	f	\N	2026-03-31 00:06:48.764434	2	f	\N	\N	\N
36	A sudden global shortage of silicon chips increases the cost of manufacturing laptops. How will this affect the market for laptops?	f	\N	2026-03-31 00:06:48.770918	2	f	\N	\N	\N
37	If the price of streaming services like Netflix increases by 20%, what is the most likely impact on the market for movie theater tickets?	f	\N	2026-03-31 00:06:48.778023	2	f	\N	\N	\N
40	Mortgage interest rates drop significantly (making it cheaper to borrow money to buy a house), while at the same time, a lumber shortage makes it much more expensive to build new homes. What happens to the housing market?	f	\N	2026-03-31 00:06:48.79725	2	f	\N	\N	\N
41	A consumer has an income of $500. Good X costs $25 per unit and Good Y costs $50 per unit. If we graph this consumer’s budget constraint with Good X on the horizontal axis and Good Y on the vertical axis, what is the y-intercept?	f	\N	2026-03-31 00:06:48.803947	2	f	\N	\N	\N
42	Suppose a consumer’s income doubles, and simultaneously, the prices of all the goods they buy also double. How will this affect their budget constraint?	f	\N	2026-03-31 00:06:48.811643	2	f	\N	\N	\N
43	A local restaurant charges $15 for a pizza and $5 for a milkshake. What is the opportunity cost of purchasing one pizza?	f	\N	2026-03-31 00:06:48.817764	2	f	\N	\N	\N
44	If the market price of a good increases, what happens to the total consumer surplus in that market, assuming the demand curve remains unchanged?	f	\N	2026-03-31 00:06:48.825893	2	f	\N	\N	\N
45	A local public transit authority decides to increase bus fares in order to generate more total revenue. This strategy will only be successful if the demand for bus rides is:	f	\N	2026-03-31 00:06:48.832333	2	f	\N	\N	\N
46	When the price of a good falls from $6 to $4, the quantity demanded rises from 20 units to 30 units. Using the midpoint method, what is the absolute value of the price elasticity of demand?	f	\N	2026-03-31 00:06:48.837562	2	f	\N	\N	\N
47	If a 10% increase in the price of a good leads to a 25% decrease in the quantity demanded, we can conclude that demand for this good is:	f	\N	2026-03-31 00:06:48.907788	2	f	\N	\N	\N
48	Which of the following statements best describes an inferior good?	f	\N	2026-03-31 00:06:48.913374	2	f	\N	\N	\N
49	Use the table below to answer Questions 16 and 17.\nQuantity  TB Burgers ($)  MB Burgers ($)  TB Fries ($)  MB Fries ($)\n1  60  60  36  36\n2  114  54  66  30\n3  162  48  90  24\n4  204  42  108  ?\n5  240  36  120  12\n\nBased on the table above, what is the Marginal Benefit of the 4th order of fries?	f	\N	2026-03-31 00:06:48.918382	2	f	\N	\N	\N
50	Use the table below to answer Questions 16 and 17.\nQuantity  TB Burgers ($)  MB Burgers ($)  TB Fries ($)  MB Fries ($)\n1  60  60  36  36\n2  114  54  66  30\n3  162  48  90  24\n4  204  42  108  ?\n5  240  36  120  12\n\nIf a consumer has a budget of $27, the price of a burger is $6, and the price of an order of fries is $3, what consumption bundle maximizes their total benefit?	f	\N	2026-03-31 00:06:48.923956	2	f	\N	\N	\N
51	A consumer has a budget of $40. Good X costs $10 and Good Y costs $5. The marginal benefit of the last unit of Good X they purchased was 50 units of utility. If they are optimizing their consumption bundle, what MUST be the marginal benefit of the last unit of Good Y they purchased?	f	\N	2026-03-31 00:06:48.930374	2	f	\N	\N	\N
52	The cross-price elasticity of demand between Good A and Good B is calculated to be -2.5. This indicates that:	f	\N	2026-03-31 00:06:48.935652	2	f	\N	\N	\N
53	Which of the following goods is likely to have the most ELASTIC demand?	f	\N	2026-03-31 00:06:48.94095	2	f	\N	\N	\N
54	When the average income in a city falls by 10%, the quantity of used cars sold increases by 5%. What is the income elasticity of demand for used cars, and what type of good are they?	f	\N	2026-03-31 00:06:48.946564	2	f	\N	\N	\N
55	Clara is willing to pay $120 for a concert ticket. She manages to buy one online for $80. During the checkout process, she is charged a $10 service fee. What is Clara’s actual consumer surplus?	f	\N	2026-03-31 00:06:48.952034	2	f	\N	\N	\N
56	Suppose the market for coffee is in equilibrium. If a medical study is published proving that drinking coffee significantly increases life expectancy, what will happen in the market?	f	\N	2026-03-31 00:06:48.957553	2	f	\N	\N	\N
57	If a perfectly competitive firm tries to raise the price of its product by even one cent above the market price, its quantity demanded will fall to zero. This implies the firm faces a demand curve that is:	f	\N	2026-03-31 00:06:48.96252	2	f	\N	\N	\N
58	Why is an individual firm in a perfectly competitive market considered a ”price taker”?	f	\N	2026-03-31 00:06:48.967326	2	f	\N	\N	\N
59	Based on the supply and demand schedule below, if the current market price is $15, what is the condition of the market?\nPrice ($)  Quantity Demanded  Quantity Supplied\n10  100  40\n15  80  60\n20  60  80\n25  40  100	f	\N	2026-03-31 00:06:48.972658	2	f	\N	\N	\N
60	A luxury good is mathematically defined as a good having an income elasticity of demand that is:	f	\N	2026-03-31 00:06:48.978036	2	f	\N	\N	\N
61	The price of Good X rises from $10 to $15. As a result, the quantity demanded of Good Y increases from 40 units to 60 units. Using the midpoint method, what is the cross-price elasticity?	f	\N	2026-03-31 00:06:48.98296	2	f	\N	\N	\N
62	If Sarah can read 4 chapters of economics or write 2 pages of her English essay in one hour, what is her opportunity cost of writing 1 page of her English essay?	f	\N	2026-03-31 00:06:48.988327	2	f	\N	\N	\N
63	A seller’s goal is to maximize:	f	\N	2026-03-31 00:06:48.99255	2	f	\N	\N	\N
39	Suppose the market demand for a product is given by Qd = 100 − 3P and the market supply is given by Qs = 20 + P . What is the equilibrium price in this market?	t	t	2026-03-31 00:06:48.789367	2	f	\N	\N	\N
38	If the current market price of a good is artificially held above the equilibrium price, we would expect:	t	t	2026-03-31 00:06:48.783457	2	f	[{"label": "A", "choiceId": 152, "isCorrect": false, "explanation": "Incorrect. A shortage happens when the price is held below equilibrium (a price ceiling), causing quantity demanded to exceed quantity supplied. If price is held above equilibrium (a price floor), the opposite market pressure occurs."}, {"label": "B", "choiceId": 153, "isCorrect": false, "explanation": "Incorrect. With a price above equilibrium, consumers move up the demand curve and buy less (quantity demanded falls), while producers move up the supply curve and produce more (quantity supplied rises). So quantity demanded does not exceed quantity supplied; it is smaller than quantity supplied."}, {"label": "C", "choiceId": 154, "isCorrect": true, "explanation": "Correct. A price held above equilibrium creates excess supply: quantity supplied is greater than quantity demanded at that higher price. The result is a surplus (unsold goods, inventories piling up)."}, {"label": "D", "choiceId": 155, "isCorrect": false, "explanation": "Incorrect. A higher-than-equilibrium price creates a surplus without requiring any curve to shift. “Clearing the market” would occur via a price decrease back toward equilibrium, not automatically by the demand curve shifting right. Demand shifts require changes in non-price determinants (income, tastes, prices of related goods, etc.), not just a price control."}]	\N	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, email, password_hash, role, must_change_password, created_at) FROM stdin;
1	Admin	chris+studybuddy@marantette.com	$2b$10$f8/n.YUf4HWiwy/qnWJmae1hIn1T.VSwkM/XfVsSqhxOfsnqW6eje	admin	f	2026-03-30 22:22:44.487741
\.


--
-- Name: choices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.choices_id_seq', 255, true);


--
-- Name: outline_sections_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.outline_sections_id_seq', 5, true);


--
-- Name: projects_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.projects_id_seq', 2, true);


--
-- Name: questions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.questions_id_seq', 63, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 1, true);


--
-- Name: choices choices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.choices
    ADD CONSTRAINT choices_pkey PRIMARY KEY (id);


--
-- Name: outline_sections outline_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.outline_sections
    ADD CONSTRAINT outline_sections_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: questions questions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: choices choices_question_id_questions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.choices
    ADD CONSTRAINT choices_question_id_questions_id_fk FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;


--
-- Name: outline_sections outline_sections_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.outline_sections
    ADD CONSTRAINT outline_sections_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: questions questions_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict LzdU7i0hNrwo1g2lCBnkhPTYT5T3sBlcNa6mToAOJvglQzdynv3epkP6tOWmQzE


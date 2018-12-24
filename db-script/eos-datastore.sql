use eos_datastore;

CREATE OR REPLACE TABLE time_type (
  time_type_id number(2,0) NOT NULL,
  time_type_desc varchar(50) NOT NULL,
  PRIMARY KEY (time_type_id)
);

CREATE OR REPLACE TABLE month_of_year (
  month_of_year number(2,0) NOT NULL,
  month_of_year_name varchar(50) NOT NULL,
  PRIMARY KEY (month_of_year)
);

CREATE OR REPLACE TABLE year (
  year_id number(4,0) NOT NULL,
  time_type_id number(2,0) NOT NULL,
  year_date date DEFAULT NULL,
  year_duration number(3,0) DEFAULT NULL,
  prev_year_id number(4,0) DEFAULT NULL,
  PRIMARY KEY (year_id),
  CONSTRAINT fk_year_time_type1 FOREIGN KEY (time_type_id) REFERENCES time_type (time_type_id) ON DELETE NO ACTION ON UPDATE NO ACTION
);


CREATE OR REPLACE TABLE quarter (
  quarter_id number(5,0) NOT NULL,
  time_type_id number(2,0) NOT NULL,
  quarter_desc varchar(50) DEFAULT NULL,
  quarter_date date DEFAULT NULL,
  quarter_duration number(2,0) DEFAULT NULL,
  prev_quarter_id number(5,0) DEFAULT NULL,
  ly_quarter_id number(5,0) DEFAULT NULL,
  year_id number(4,0) NOT NULL,
  PRIMARY KEY (quarter_id),
  CONSTRAINT fk_quarter_time_type1 FOREIGN KEY (time_type_id) REFERENCES time_type (time_type_id) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT fk_quarter_year1 FOREIGN KEY (year_id) REFERENCES year (year_id) ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE OR REPLACE TABLE month (
  month_id number(6,0) NOT NULL,
  time_type_id number(2,0) NOT NULL,
  month_desc varchar(50) DEFAULT NULL,
  month_date date DEFAULT NULL,
  month_duration number(2,0) DEFAULT NULL,
  prev_month_id number(6,0) DEFAULT NULL,
  ly_month_id number(6,0) DEFAULT NULL,
  month_of_year number(2,0) NOT NULL,
  quarter_id number(5,0) NOT NULL,
  year_id number(4,0) NOT NULL,
  PRIMARY KEY (month_id),
  CONSTRAINT fk_month_month_of_year1 FOREIGN KEY (month_of_year) REFERENCES month_of_year (month_of_year) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT fk_month_quarter1 FOREIGN KEY (quarter_id) REFERENCES quarter (quarter_id) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT fk_month_time_type1 FOREIGN KEY (time_type_id) REFERENCES time_type (time_type_id) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT fk_month_year1 FOREIGN KEY (year_id) REFERENCES year (year_id) ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE OR REPLACE TABLE day (
  day_id number(7,0) NOT NULL,
  time_type_id number(2,0) NOT NULL,
  day_date date DEFAULT NULL,
  prev_day_id number(7,0) DEFAULT NULL,
  lm_day_id number(7,0) DEFAULT NULL,
  ly_day_id number(7,0) DEFAULT NULL,
  month_id number(6,0) NOT NULL,
  quarter_id number(5,0) NOT NULL,
  year_id number(4,0) NOT NULL,
  PRIMARY KEY (day_id),
  CONSTRAINT fk_day_month1 FOREIGN KEY (month_id) REFERENCES month (month_id) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT fk_day_quarter1 FOREIGN KEY (quarter_id) REFERENCES quarter (quarter_id) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT fk_day_time_type1 FOREIGN KEY (time_type_id) REFERENCES time_type (time_type_id) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT fk_day_year1 FOREIGN KEY (year_id) REFERENCES year (year_id) ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE OR REPLACE TABLE ytm_month (
  month_id number(6,0) NOT NULL,
  ytm_month_id number(6,0) NOT NULL,
  PRIMARY KEY (month_id,ytm_month_id),
  CONSTRAINT fk_ytm_month_month1 FOREIGN KEY (month_id) REFERENCES month (month_id) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT fk_ytm_month_month2 FOREIGN KEY (ytm_month_id) REFERENCES month (month_id) ON DELETE NO ACTION ON UPDATE NO ACTION
);

INSERT INTO month_of_year 
VALUES (-4,'Hasn\'t Happened'),
       (-3,'Corrupted'),
       (-2,'Not Applicable'),
       (-1,'Unknown'),
       (0,'Normal'),
       (1,'Jan'),
       (2,'Feb'),
       (3,'Mar'),
       (4,'Apr'),
       (5,'May'),
       (6,'Jun'),
       (7,'Jul'),
       (8,'Aug'),
       (9,'Sep'),
       (10,'Oct'),
       (11,'Nov'),
       (12,'Dec');

INSERT INTO time_type 
VALUES (-4,'Hasn\'t Happened'),
       (-3,'Corrupted'),
       (-2,'Not Applicable'),
       (-1,'Unknown'),
       (0,'Normal');

CREATE OR REPLACE TABLE dapp_type (
  dapp_type_id number(3,0) NOT NULL,
  dapp_type_desc varchar(50) NOT NULL,
  PRIMARY KEY (dapp_type_id)
);

INSERT INTO dapp_type (dapp_type_id, dapp_type_desc)
VALUES (-2, 'Not Applicable'),
       (-1, 'Unknown'),
       (1, 'Token'),
       (2, 'Exchange'),
       (3, 'Gambling'),
       (4, 'Gaming'),
       (5, 'Social');

CREATE OR REPLACE TABLE dapp (
    dapp_id int NOT NULL AUTOINCREMENT START 100,
    dapp_name VARCHAR(50) NOT NULL UNIQUE,
    dapp_type_id number(3,0) NOT NULL,
    PRIMARY KEY (dapp_id),
    CONSTRAINT fk_dapp_dapp_type FOREIGN KEY (dapp_type_id) REFERENCES  dapp_type (dapp_type_id) ON DELETE NO ACTION ON UPDATE NO ACTION
);

INSERT INTO dapp (dapp_id, dapp_name, dapp_type_id)
VALUES (-1, 'Unknown', -1),
       (1, 'EOS Token', 1),
       (2, 'EOS Black Token', 1),
       (3, 'Parsl SEED Token', 1),
       (4, 'MEETONE Token', 1),
       (5, 'Everopedia IQ Token', 1),
       (6, 'OCT Token', 1),
       (7, 'EOSDAC Token', 1),
       (8, 'TRYBE Token', 1),
       (9, 'KARMA Token', 1),
       (10, 'BNT Token', 1),
       (11, 'ADD Token', 1),
       (12, 'EDNA Token', 1),
       (13, 'Newdex', 2),
       (14, 'DEXEOS', 2),
       (15, 'WhaleEX', 2),
       (16, 'Findex', 2),
       (17, 'BTEX', 2),
       (18, 'Namedex', 2),
       (19, 'OneDex', 2),
       (20, 'dex.io', 2),
       (21, 'DeltaDex', 2),
       (22, 'EOSDAQ', 2),
       (23, 'FarmEOS', 3),
       (24, 'Fishjoy', 3),
       (25, 'EOSBet', 3),
       (26, 'Fastwin', 3),
       (27, 'Endless Dice', 3);

CREATE OR REPLACE TABLE account_type (
  account_type_id number(2,0) NOT NULL,
  account_type_desc varchar(50) NOT NULL,
  PRIMARY KEY (account_type_id)
);

INSERT INTO account_type (account_type_id, account_type_desc)
VALUES (-1, 'Unknown'),
       (1, 'Dapp'),
       (2, 'User');

CREATE OR REPLACE TABLE account (
  account_id int NOT NULL AUTOINCREMENT START 100,
  account_name varchar(50) NOT NULL UNIQUE,
  account_type_id number(2,0) NOT NULL,
  dapp_id int NOT NULL,
  PRIMARY KEY (account_id),
  CONSTRAINT fk_account_account_type FOREIGN KEY (account_type_id) REFERENCES  account_type (account_type_id) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT fk_account_dapp FOREIGN KEY (dapp_id) REFERENCES  dapp (dapp_id) ON DELETE NO ACTION ON UPDATE NO ACTION
);

INSERT INTO account (account_id, account_name, account_type_id, dapp_id)
VALUES (-1, 'Unknown', -1, -1),
       (1, 'eosio.token', 1, 1),
       (2, 'eosblackteam', 1, 2),
       (3, 'parslseed123', 1, 3),
       (4, 'eosiomeetone', 1, 4),
       (5, 'everipediaiq', 1, 5),
       (6, 'octtothemoon', 1, 6),
       (7, 'eosdactoken', 1, 7),
       (8, 'trybenetwork', 1, 8),
       (9, 'therealkarma', 1, 9),
       (10, 'bntbntbntbnt', 1, 10),
       (11, 'eosadddddddd', 1, 11),
       (12, 'ednazztoken', 1, 12),
       (13, 'newdexpocket', 1, 13),
       (14, 'dexeoswallet', 1, 14),
       (15, 'whaleextrust', 1, 15),
       (16, 'findexfindex', 1, 16),
       (17, 'btexexchange', 1, 17),
       (18, 'exchangename', 1, 18),
       (19, 'OneDex123451', 1, 19),
       (20, 'dex.io', 1, 20),
       (21, 'deltadexcode', 1, 21),
       (22, 'eosdaqooooo1', 1, 22),
       (23, 'eosdaqooooo2', 1, 22),
       (24, 'eosdaqooooo4', 1, 22),
       (25, 'eosdaqoooo54', 1, 22),
       (26, 'eosdaqoooo11', 1, 22),
       (27, 'eosdaqooo1oo', 1, 22),
       (28, 'eosdaqooo1o2', 1, 22),
       (29, 'eosdaqooo1o5', 1, 22),
       (30, 'eosdaqooo11o', 1, 22),
       (31, 'eosdaqooo111', 1, 22),
       (32, 'farmeosbank1', 1, 23),
       (33, 'fishjoyadmin', 1, 24),
       (34, 'eosbetdice11', 1, 25),
       (35, 'eosbaccarat1', 1, 25),
       (36, 'eosbetcrash1', 1, 25),
       (37, 'fastwindice1', 1, 26),
       (38, 'endlessdicex', 1, 27);


CREATE OR REPLACE TABLE action (
  action_id int NOT NULL AUTOINCREMENT,
  action_name varchar(50) NOT NULL,
  account_id int NOT NULL,
  PRIMARY KEY (action_id),
  CONSTRAINT unq_idx UNIQUE(action_name, account_id)
);

CREATE OR REPLACE TABLE channel (
  channel_id number(2,0) NOT NULL AUTOINCREMENT,
  channel_name varchar(50) NOT NULL UNIQUE,
  PRIMARY KEY (channel_id)
);

INSERT INTO channel (channel_id, channel_name)
VALUES (-1, 'Unknown');


CREATE OR REPLACE TABLE order_type (
  order_type_id number(2,0) NOT NULL,
  order_type_name varchar(50) NOT NULL UNIQUE,
  PRIMARY KEY (order_type_id)
);

INSERT INTO order_type (order_type_id, order_type_name)
VALUES (-1, 'Unknown'),
       (1, 'BUY'),
       (2, 'BUY-LIMIT'),
       (3, 'SELL'),
       (4, 'SELL-LIMIT'),
       (5, 'CANCEL');

CREATE OR REPLACE TABLE token (
  token_id int NOT NULL AUTOINCREMENT START 100,
  token_name varchar(50) NOT NULL UNIQUE,
  account_id int NOT NULL,
  PRIMARY KEY (token_id),
  CONSTRAINT fk_token_account FOREIGN KEY (account_id) REFERENCES  account (account_id) ON DELETE NO ACTION ON UPDATE NO ACTION
);

INSERT INTO token (token_id, token_name, account_id)
VALUES (-1, 'Unknown', -1),
       (1, 'EOS', 1);

CREATE OR REPLACE TABLE exchange_trade (
  exchange_trade_id int NOT NULL AUTOINCREMENT,
  token_account_id int NOT NULL,
  action_id int NOT NULL,
  from_account_id int NOT NULL,
  to_account_id int NOT NULL,
  quantity NUMBER(24, 9) NOT NULL,
  quantity_token_id int NOT NULL,
  order_type_id NUMBER(2, 0) NOT NULL,
  quote_token_id int NOT NULL,
  base_token_id int NOT NULL,
  trade_quantity NUMBER(24, 9),
  trade_price NUMBER(24, 9),
  channel_id NUMBER(2,0) NOT NULL,
  day_id NUMBER(7, 0) NOT NULL,
  hour_of_day NUMBER(2,0) NOT NULL,
  block_time datetime NOT NULL,
  PRIMARY KEY (exchange_trade_id),
  CONSTRAINT fk_exchange_trade_account1 FOREIGN KEY (token_account_id) REFERENCES account (account_id) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT fk_exchange_trade_action1 FOREIGN KEY (action_id) REFERENCES action (action_id) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT fk_exchange_trade_account2 FOREIGN KEY (from_account_id) REFERENCES account (account_id) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT fk_exchange_trade_account3 FOREIGN KEY (to_account_id) REFERENCES account (account_id) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT fk_exchange_trade_token1 FOREIGN KEY (quantity_token_id) REFERENCES token (token_id) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT fk_exchange_trade_order_type1 FOREIGN KEY (order_type_id) REFERENCES order_type (order_type_id) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT fk_exchange_trade_token2 FOREIGN KEY (quote_token_id) REFERENCES token (token_id) ON DELETE NO ACTION ON UPDATE NO ACTION,                                                                          
  CONSTRAINT fk_exchange_trade_token3 FOREIGN KEY (base_token_id) REFERENCES token (token_id) ON DELETE NO ACTION ON UPDATE NO ACTION,                                                                                  
  CONSTRAINT fk_exchange_trade_channel FOREIGN KEY (channel_id) REFERENCES channel (channel_id) ON DELETE NO ACTION ON UPDATE NO ACTION,                                                                                     
  CONSTRAINT fk_exchange_trade_day FOREIGN KEY (day_id) REFERENCES day (day_id) ON DELETE NO ACTION ON UPDATE NO ACTION
);


CREATE OR REPLACE TABLE dapp_table(
    dapp_table_id int NOT NULL AUTOINCREMENT START 100,
    dapp_table_name VARCHAR(50) NOT NULL,
    code_account_id int NOT NULL,
    scope_account_id int NOT NULL,
    PRIMARY KEY (dapp_table_id),
    CONSTRAINT unq_idx1 UNIQUE(dapp_table_name, code_account_id, scope_account_id),
    CONSTRAINT fk_dapp_table_account1 FOREIGN KEY (code_account_id) REFERENCES account (account_id) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT fk_dapp_table_account2 FOREIGN KEY (scope_account_id) REFERENCES account (account_id) ON DELETE NO ACTION ON UPDATE NO ACTION
);

INSERT INTO dapp_table (dapp_table_id, dapp_table_name, code_account_id, scope_account_id)
VALUES(1, 'bets', 32, 32),
      (2, 'rouls', 32, 32),
      (3, 'mines', 32, 32),
      (4, 'bjs', 32, 32),
      (5, 'betticket21', 33, 33),
      (6, 'activebets', 34, 34),
      (7, 'activebets', 35, 35),
      (8, 'activebets', 36, 36),
      (9, 'activebets', 37, 37),
      (10, 'bets', 38, 38);

CREATE OR REPLACE TABLE bet_status (
    bet_status_id NUMBER(1, 0),
    bet_status_desc VARCHAR(50),
    PRIMARY KEY (bet_status_id)
);

INSERT INTO bet_status (bet_status_id, bet_status_desc)
VALUES (-1, 'Unknown'),
       (1, 'PLACED'),
       (2, 'COMPLETED');

CREATE OR REPLACE TABLE bet (
    bet_id int NOT NULL AUTOINCREMENT,
    dapp_table_id int NOT NULL,
    game_bet_id int NOT NULL,
    user_account_id int NOT NULL,
    bet_amount number(24, 9) NOT NULL,
    bet_token_id int NOT NULL,
    win_amount number(24, 9),
    win_token_id int NOT NULL,
    bet_status_id number(1, 0) NOT NULL,
    placed_day_id NUMBER(7, 0) NOT NULL,
    placed_hour_of_day NUMBER(2,0) NOT NULL,
    placed_time datetime NOT NULL,
    completed_day_id NUMBER(7, 0) NOT NULL,
    completed_hour_of_day NUMBER(2,0),
    completed_time datetime,
    PRIMARY KEY (bet_id),
    CONSTRAINT unq_idx1 UNIQUE(dapp_table_id, bet_id),
    CONSTRAINT fk_bet_dapp_table1 FOREIGN KEY (dapp_table_id) REFERENCES dapp_table (dapp_table_id) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT fk_bet_token1 FOREIGN KEY (bet_token_id) REFERENCES token (token_id) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT fk_bet_token2 FOREIGN KEY (win_token_id) REFERENCES token (token_id) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT fk_bet_account1 FOREIGN KEY (user_account_id) REFERENCES account (account_id) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT fk_bet_bet_status FOREIGN KEY (bet_status_id) REFERENCES bet_status (bet_status_id) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT fk_bet_day1 FOREIGN KEY (placed_day_id) REFERENCES day (day_id) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT fk_bet_day2 FOREIGN KEY (completed_day_id) REFERENCES day (day_id) ON DELETE NO ACTION ON UPDATE NO ACTION
);


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
       

CREATE OR REPLACE TABLE account_type (
  account_type_id number(2,0) NOT NULL,
  account_type_desc varchar(50) NOT NULL,
  PRIMARY KEY (account_type_id)
);

INSERT INTO account_type (account_type_id, account_type_desc)
VALUES (-1, 'Unknown'),
       (1, 'Token'),
       (2, 'Exchange'),
       (3, 'Exchange');

CREATE OR REPLACE TABLE account (
  account_id int NOT NULL AUTOINCREMENT,
  account_name varchar(50) NOT NULL,
  account_type_id number(2,0) NOT NULL,
  PRIMARY KEY (account_id),
  CONSTRAINT fk_account_account_type FOREIGN KEY (account_type_id) REFERENCES  account_type (account_type_id) ON DELETE NO ACTION ON UPDATE NO ACTION
);

INSERT INTO account (account_id, account_name, account_type_id)
VALUES (-1, 'Unknown', -1);


CREATE OR REPLACE TABLE action (
  action_id int NOT NULL AUTOINCREMENT,
  action_name varchar(50) NOT NULL,
  PRIMARY KEY (action_id)
);

CREATE OR REPLACE TABLE channel (
  channel_id number(2,0) NOT NULL,
  channel_name varchar(50) NOT NULL,
  PRIMARY KEY (channel_id)
);

INSERT INTO channel (channel_id, channel_name)
VALUES (-1, 'Unknown');


CREATE OR REPLACE TABLE order_type (
  order_type_id number(2,0) NOT NULL,
  order_type_name varchar(50) NOT NULL,
  PRIMARY KEY (order_type_id)
);

INSERT INTO order_type (order_type_id, order_type_name)
VALUES (-1, 'Unknown'),
       (1, 'buy'),
       (2, 'buy-limit'),
       (3, 'sell'),
       (4, 'sell-limit'),
       (5, 'cancel');

CREATE OR REPLACE TABLE token (
  token_id int NOT NULL AUTOINCREMENT,
  token_name varchar(50) NOT NULL,
  account_id int NOT NULL,
  PRIMARY KEY (token_id),
  CONSTRAINT fk_token_account FOREIGN KEY (account_id) REFERENCES  account (account_id) ON DELETE NO ACTION ON UPDATE NO ACTION
);

INSERT INTO token (token_id, token_name, account_id)
VALUES (-1, 'Unknown', -1);

CREATE OR REPLACE TABLE exchange_trades (
  id int NOT NULL AUTOINCREMENT,
  token_account_id int NOT NULL,
  action_id int NOT NULL,
  from_account_id int NOT NULL,
  to_account_id int NOT NULL,
  quantity NUMBER(22, 7) NOT NULL,
  quantity_token_id int NOT NULL,
  order_type_id NUMBER(2, 0) NOT NULL,
  quote_token_id int NOT NULL,
  base_token_id int NOT NULL,
  trade_quantity NUMBER(22, 7),
  trade_price NUMBER(22, 7),
  channel_id NUMBER(2,0) NOT NULL,
  day_id NUMBER(7, 0) NOT NULL,
  hour_of_day NUMBER(2,0) NOT NULL,
  block_time datetime NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_exchange_trades_account1 FOREIGN KEY (token_account_id) REFERENCES account (account_id) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT fk_exchange_trades_action1 FOREIGN KEY (action_id) REFERENCES action (action_id) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT fk_exchange_trades_account2 FOREIGN KEY (from_account_id) REFERENCES account (account_id) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT fk_exchange_trades_account3 FOREIGN KEY (to_account_id) REFERENCES account (account_id) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT fk_exchange_trades_token1 FOREIGN KEY (quantity_token_id) REFERENCES token (token_id) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT fk_exchange_trades_order_type1 FOREIGN KEY (order_type_id) REFERENCES order_type (order_type_id) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT fk_exchange_trades_token2 FOREIGN KEY (quote_token_id) REFERENCES token (token_id) ON DELETE NO ACTION ON UPDATE NO ACTION,                                                                          
  CONSTRAINT fk_exchange_trades_token3 FOREIGN KEY (base_token_id) REFERENCES token (token_id) ON DELETE NO ACTION ON UPDATE NO ACTION,                                                                                  
  CONSTRAINT fk_exchange_trades_channel FOREIGN KEY (channel_id) REFERENCES channel (channel_id) ON DELETE NO ACTION ON UPDATE NO ACTION,                                                                                     
  CONSTRAINT fk_exchange_trades_day FOREIGN KEY (day_id) REFERENCES day (day_id) ON DELETE NO ACTION ON UPDATE NO ACTION
);

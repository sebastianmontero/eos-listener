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

CREATE TABLE exchange_trades (
  id int NOT NULL AUTO_INCREMENT,
  account varchar(50) NOT NULL,
  action varchar(50) NOT NULL,
  from varchar(50) NOT NULL,
  to varchar(50) NOT NULL,
  quantity varchar(50) NOT NULL,
  ordertype varchar(50) DEFAULT NULL,
  pair varchar(50) DEFAULT NULL,
  trade_quantity varchar(50) DEFAULT NULL,
  trade_price varchar(50) DEFAULT NULL,
  channel varchar(50) DEFAULT NULL,
  day_id mediumint(9) NOT NULL,
  hour_of_day tinyint(4) NOT NULL,
  block_time datetime NOT NULL DEFAULT '2000-01-01 00:00:00',
  PRIMARY KEY (id),
  KEY fk_exchange_trades_day_idx (day_id),
  CONSTRAINT fk_exchange_trades_day FOREIGN KEY (day_id) REFERENCES day (day_id) ON DELETE NO ACTION ON UPDATE NO ACTION
);

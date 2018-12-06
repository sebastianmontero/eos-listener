-- MySQL dump 10.13  Distrib 5.7.24, for Linux (x86_64)
--
-- Host: 127.0.0.1    Database: guider
-- ------------------------------------------------------
-- Server version	5.7.24-0ubuntu0.16.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `day`
--

DROP TABLE IF EXISTS `day`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `day` (
  `day_id` mediumint(9) NOT NULL,
  `time_type_id` tinyint(4) NOT NULL,
  `day_date` date DEFAULT NULL,
  `prev_day_id` int(11) DEFAULT NULL,
  `lm_day_id` int(11) DEFAULT NULL,
  `ly_day_id` int(11) DEFAULT NULL,
  `month_id` mediumint(9) NOT NULL,
  `quarter_id` smallint(6) NOT NULL,
  `year_id` smallint(6) NOT NULL,
  PRIMARY KEY (`day_id`),
  KEY `fk_day_month1` (`month_id`),
  KEY `fk_day_quarter1` (`quarter_id`),
  KEY `fk_day_time_type1` (`time_type_id`),
  KEY `fk_day_year1` (`year_id`),
  CONSTRAINT `fk_day_month1` FOREIGN KEY (`month_id`) REFERENCES `month` (`month_id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_day_quarter1` FOREIGN KEY (`quarter_id`) REFERENCES `quarter` (`quarter_id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_day_time_type1` FOREIGN KEY (`time_type_id`) REFERENCES `time_type` (`time_type_id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_day_year1` FOREIGN KEY (`year_id`) REFERENCES `year` (`year_id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `month`
--

DROP TABLE IF EXISTS `month`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `month` (
  `month_id` mediumint(9) NOT NULL,
  `time_type_id` tinyint(4) NOT NULL,
  `month_desc` varchar(50) DEFAULT NULL,
  `month_date` date DEFAULT NULL,
  `month_duration` tinyint(3) unsigned DEFAULT NULL,
  `prev_month_id` mediumint(9) DEFAULT NULL,
  `ly_month_id` mediumint(9) DEFAULT NULL,
  `month_of_year` tinyint(4) NOT NULL,
  `quarter_id` smallint(6) NOT NULL,
  `year_id` smallint(6) NOT NULL,
  PRIMARY KEY (`month_id`),
  KEY `fk_month_month_of_year1` (`month_of_year`),
  KEY `fk_month_quarter1` (`quarter_id`),
  KEY `fk_month_year1` (`year_id`),
  KEY `fk_month_time_type1` (`time_type_id`),
  CONSTRAINT `fk_month_month_of_year1` FOREIGN KEY (`month_of_year`) REFERENCES `month_of_year` (`month_of_year`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_month_quarter1` FOREIGN KEY (`quarter_id`) REFERENCES `quarter` (`quarter_id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_month_time_type1` FOREIGN KEY (`time_type_id`) REFERENCES `time_type` (`time_type_id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_month_year1` FOREIGN KEY (`year_id`) REFERENCES `year` (`year_id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `month_of_year`
--

DROP TABLE IF EXISTS `month_of_year`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `month_of_year` (
  `month_of_year` tinyint(4) NOT NULL,
  `month_of_year_name` varchar(50) NOT NULL,
  PRIMARY KEY (`month_of_year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `month_of_year`
--

LOCK TABLES `month_of_year` WRITE;
/*!40000 ALTER TABLE `month_of_year` DISABLE KEYS */;
INSERT INTO `month_of_year` VALUES (-4,'Hasn\'t Happened'),(-3,'Corrupted'),(-2,'Not Applicable'),(-1,'Unknown'),(0,'Normal'),(1,'Jan'),(2,'Feb'),(3,'Mar'),(4,'Apr'),(5,'May'),(6,'Jun'),(7,'Jul'),(8,'Aug'),(9,'Sep'),(10,'Oct'),(11,'Nov'),(12,'Dec');
/*!40000 ALTER TABLE `month_of_year` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quarter`
--

DROP TABLE IF EXISTS `quarter`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `quarter` (
  `quarter_id` smallint(6) NOT NULL,
  `time_type_id` tinyint(4) NOT NULL,
  `quarter_desc` varchar(50) DEFAULT NULL,
  `quarter_date` date DEFAULT NULL,
  `quarter_duration` tinyint(3) unsigned DEFAULT NULL,
  `prev_quarter_id` smallint(6) DEFAULT NULL,
  `ly_quarter_id` smallint(6) DEFAULT NULL,
  `year_id` smallint(6) NOT NULL,
  PRIMARY KEY (`quarter_id`),
  KEY `fk_quarter_year1` (`year_id`),
  KEY `fk_quarter_time_type1` (`time_type_id`),
  CONSTRAINT `fk_quarter_time_type1` FOREIGN KEY (`time_type_id`) REFERENCES `time_type` (`time_type_id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_quarter_year1` FOREIGN KEY (`year_id`) REFERENCES `year` (`year_id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `time_type`
--

DROP TABLE IF EXISTS `time_type`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `time_type` (
  `time_type_id` tinyint(4) NOT NULL,
  `time_type_desc` varchar(50) NOT NULL,
  PRIMARY KEY (`time_type_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Time types(Normal, Not Applicable, Corrupt)';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `time_type`
--

LOCK TABLES `time_type` WRITE;
/*!40000 ALTER TABLE `time_type` DISABLE KEYS */;
INSERT INTO `time_type` VALUES (-4,'Hasn\'t Happened'),(-3,'Corrupted'),(-2,'Not Applicable'),(-1,'Unknown'),(0,'Normal');
/*!40000 ALTER TABLE `time_type` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `year`
--

DROP TABLE IF EXISTS `year`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `year` (
  `year_id` smallint(6) NOT NULL,
  `time_type_id` tinyint(4) NOT NULL,
  `year_date` date DEFAULT NULL,
  `year_duration` smallint(5) unsigned DEFAULT NULL,
  `prev_year_id` smallint(6) DEFAULT NULL,
  PRIMARY KEY (`year_id`),
  KEY `fk_year_time_type1` (`time_type_id`),
  CONSTRAINT `fk_year_time_type1` FOREIGN KEY (`time_type_id`) REFERENCES `time_type` (`time_type_id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `ytm_month`
--

DROP TABLE IF EXISTS `ytm_month`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ytm_month` (
  `month_id` mediumint(9) NOT NULL,
  `ytm_month_id` mediumint(9) NOT NULL,
  PRIMARY KEY (`month_id`,`ytm_month_id`),
  KEY `fk_ytm_month_month2` (`ytm_month_id`),
  CONSTRAINT `fk_ytm_month_month1` FOREIGN KEY (`month_id`) REFERENCES `month` (`month_id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_ytm_month_month2` FOREIGN KEY (`ytm_month_id`) REFERENCES `month` (`month_id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='Year To Month';
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2018-12-04 18:22:41

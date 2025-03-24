from datetime import datetime, timedelta
from sqlalchemy import func
from app.models import db, APICall, APIDailyMetric
from app.services.logger import setup_logging

logger = setup_logging(__name__)

class MetricsTracker:
    @staticmethod
    def track_api_call(api_id, user_id=None, status_code=200, response_time=0.0, 
                       endpoint='/', method='GET', is_success=True, error_message=None):
        """Track an individual API call"""
        try:
            api_call = APICall(
                api_id=api_id,
                user_id=user_id,
                status_code=status_code,
                response_time=response_time,
                endpoint=endpoint,
                method=method,
                is_success=is_success,
                error_message=error_message
            )
            db.session.add(api_call)
            db.session.commit()
            
            # Update daily metrics
            MetricsTracker.update_daily_metrics(api_id, is_success, response_time)
            logger.info(f"Tracked API call: {api_id}, status: {status_code}, time: {response_time:.3f}s")
            return True
        except Exception as e:
            logger.error(f"Error tracking API call: {str(e)}")
            db.session.rollback()
            return False
        
    @staticmethod
    def update_daily_metrics(api_id, is_success, response_time):
        """Update daily aggregated metrics"""
        try:
            today = datetime.utcnow().date()
            
            # Find or create daily metric
            daily_metric = APIDailyMetric.query.filter_by(
                api_id=api_id, 
                date=today
            ).first()
            
            if not daily_metric:
                daily_metric = APIDailyMetric(
                    api_id=api_id,
                    date=today,
                    total_calls=0,
                    successful_calls=0,
                    failed_calls=0,
                    avg_response_time=0.0
                )
                db.session.add(daily_metric)
            
            # Update statistics
            daily_metric.total_calls += 1
            if is_success:
                daily_metric.successful_calls += 1
            else:
                daily_metric.failed_calls += 1
            
            # Update average response time
            total_time = daily_metric.avg_response_time * (daily_metric.total_calls - 1)
            daily_metric.avg_response_time = (total_time + response_time) / daily_metric.total_calls
            
            db.session.commit()
            logger.debug(f"Updated daily metrics for {api_id}: total calls: {daily_metric.total_calls}")
            return True
        except Exception as e:
            logger.error(f"Error updating daily metrics: {str(e)}")
            db.session.rollback()
            return False
    
    @staticmethod
    def get_daily_metrics(days=30, api_id=None):
        """Get daily metrics for the dashboard"""
        try:
            end_date = datetime.utcnow().date()
            start_date = end_date - timedelta(days=days)
            
            query = APIDailyMetric.query.filter(APIDailyMetric.date >= start_date)
            
            if api_id:
                query = query.filter_by(api_id=api_id)
                
            metrics_data = query.order_by(APIDailyMetric.date).all()
            
            # Process daily metrics
            daily_data = {}
            total_calls = 0
            successful_calls = 0
            failed_calls = 0
            
            for metric in metrics_data:
                date_str = metric.date.strftime('%Y-%m-%d')
                daily_data[date_str] = {
                    'total_calls': metric.total_calls,
                    'successful_calls': metric.successful_calls,
                    'failed_calls': metric.failed_calls
                }
                total_calls += metric.total_calls
                successful_calls += metric.successful_calls
                failed_calls += metric.failed_calls
            
            result = {
                'total_calls': total_calls,
                'successful_calls': successful_calls,
                'failed_calls': failed_calls,
                'daily_data': daily_data
            }
            
            return result
        except Exception as e:
            logger.error(f"Error retrieving daily metrics: {str(e)}")
            return {
                'total_calls': 0,
                'successful_calls': 0,
                'failed_calls': 0,
                'daily_data': {}
            }
    
    @staticmethod
    def get_api_performance(days=30):
        """Get performance metrics for all APIs"""
        try:
            end_date = datetime.utcnow().date()
            start_date = end_date - timedelta(days=days)
            
            # Aggregate data by API
            result = db.session.query(
                APICall.api_id,
                func.count(APICall.id).label('total_calls'),
                func.avg(APICall.response_time).label('avg_response_time'),
                func.sum(func.cast(~APICall.is_success, db.Integer)).label('error_count')
            ).filter(
                func.date(APICall.timestamp) >= start_date
            ).group_by(
                APICall.api_id
            ).all()
            
            return [
                {
                    'api_id': r.api_id,
                    'total_calls': r.total_calls,
                    'avg_response_time': float(r.avg_response_time or 0),
                    'error_rate': float(r.error_count / r.total_calls if r.total_calls > 0 else 0)
                }
                for r in result
            ]
        except Exception as e:
            logger.error(f"Error retrieving API performance: {str(e)}")
            return []
            
    @staticmethod
    def get_api_metrics(days=30):
        """Get metrics dictionary for each API"""
        api_performance = MetricsTracker.get_api_performance(days)
        api_metrics = {}
        
        for api in api_performance:
            api_metrics[api['api_id']] = {
                'average_response_time': api['avg_response_time'],
                'calls': api['total_calls']
            }
            
        return api_metrics
            
    @staticmethod
    def get_chart_data(days=30, api_id=None):
        """Get data formatted for charts"""
        try:
            daily_metrics_result = MetricsTracker.get_daily_metrics(days, api_id)
            daily_data = daily_metrics_result['daily_data']
            
            date_labels = []
            api_calls = []
            success_calls = []
            error_calls = []
            
            # Sort dates for the chart
            sorted_dates = sorted(daily_data.keys())
            for date in sorted_dates[-days:]:  # Limit to requested days
                date_labels.append(date)
                data = daily_data[date]
                api_calls.append(data['total_calls'])
                success_calls.append(data['successful_calls'])
                error_calls.append(data['failed_calls'])
                
            return {
                'dates': date_labels,
                'api_calls': api_calls,
                'success_calls': success_calls,
                'error_calls': error_calls
            }
        except Exception as e:
            logger.error(f"Error retrieving chart data: {str(e)}")
            return {
                'dates': [],
                'api_calls': [],
                'success_calls': [],
                'error_calls': []
            }

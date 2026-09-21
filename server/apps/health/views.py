from rest_framework.response import Response
from rest_framework.views import APIView


class HealthCheckView(APIView):
    authentication_classes = []
    permission_classes = []
    # An uptime monitor (or Render's health check) shares one IP; the anonymous
    # 10/hour limit would turn it into a false alarm.
    throttle_classes = []

    def get(self, request):
        return Response({"status": "ok", "service": "fitness-api"})
